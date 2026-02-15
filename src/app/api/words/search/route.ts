import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { evaluateWithGatekeeper } from '@/lib/gatekeeper'
import { generateWordData } from '@/lib/word-generator'
import { checkRateLimit } from '@/lib/rate-limit'
import { logEvent } from '@/lib/event-logger'
import type { Word, SearchResult } from '@/types/database'

// 입력 정규화
function normalizeInput(raw: string): string {
  const trimmed = raw.trim().slice(0, 100)
  return trimmed.toLowerCase().replace(/\s+/g, ' ')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input, sessionId } = body

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: '검색어를 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: '세션 정보가 필요합니다.' },
        { status: 400 }
      )
    }

    // 입력 정규화
    const normalized = normalizeInput(input)

    if (!normalized) {
      return NextResponse.json(
        { error: '유효한 검색어를 입력해 주세요.' },
        { status: 400 }
      )
    }

    // 사용자 인증 확인
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userId = user?.id || null
    const isAuthenticated = !!userId

    // Rate Limit 체크
    const identifier = userId || sessionId
    const rateLimit = await checkRateLimit(identifier, isAuthenticated)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: '오늘의 검색 한도를 초과했습니다.',
          limit: rateLimit.limit,
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429 }
      )
    }

    // IP/UA 추출
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
    const ua = request.headers.get('user-agent') || null

    // 1. DB에서 기존 단어 조회
    const { data: existingWord } = await supabaseAdmin
      .from('words')
      .select('*')
      .eq('word', normalized)
      .eq('exam_type', 'TEPS')
      .single()

    if (existingWord) {
      // 검색 횟수 증가
      await supabaseAdmin.rpc('increment_search_count', {
        word_id: existingWord.id,
      })

      // 검색 로그 기록
      await logSearch(sessionId, userId, normalized, 'VALID', ip, ua)

      // 이벤트 로그 기록
      logEvent({
        sessionId,
        userId,
        page: '/search',
        action: 'word_search',
        metadata: { word: normalized, status: 'VALID', ip, ua },
      })

      // 로그인 사용자의 검색 이력 저장
      if (userId) {
        await saveUserWordHistory(userId, existingWord.id)
      }

      const result: SearchResult = {
        type: 'word',
        data: transformWord(existingWord),
      }

      return NextResponse.json({
        result,
        remaining: rateLimit.remaining - 1,
      })
    }

    // 2. Gatekeeper 평가
    const gatekeeperResult = await evaluateWithGatekeeper(normalized)

    // 검색 로그 기록
    await logSearch(sessionId, userId, normalized, gatekeeperResult.status, ip, ua)

    // 이벤트 로그 기록
    logEvent({
      sessionId,
      userId,
      page: '/search',
      action: 'word_search',
      metadata: { word: normalized, status: gatekeeperResult.status, ip, ua },
    })

    // 3. Gatekeeper 결과에 따른 처리
    switch (gatekeeperResult.status) {
      case 'VALID': {
        // 단어 생성
        const wordData = await generateWordData(normalized)

        // DB 저장 (동시성 처리 - UPSERT)
        const { data: savedWord, error: saveError } = await supabaseAdmin
          .from('words')
          .upsert(
            {
              word: normalized,
              exam_type: 'TEPS',
              part_of_speech: wordData.part_of_speech,
              pronunciation: wordData.pronunciation,
              meanings: wordData.meanings,
              image_text: wordData.image_text,
              description: wordData.description,
              description_en: wordData.description_en,
              teps_point: wordData.teps_point,
              synonyms: wordData.synonyms,
              antonyms: wordData.antonyms,
              comparisons: wordData.comparisons,
              paraphrasing: wordData.paraphrasing,
              example_sentence: wordData.example_sentence,
              example_translation: wordData.example_translation,
              difficulty_level: wordData.difficulty_level,
              search_count: 1,
            },
            { onConflict: 'word,exam_type', ignoreDuplicates: false }
          )
          .select()
          .single()

        if (saveError) {
          // 동시 삽입 충돌 시 다시 조회
          const { data: retryWord } = await supabaseAdmin
            .from('words')
            .select('*')
            .eq('word', normalized)
            .eq('exam_type', 'TEPS')
            .single()

          if (retryWord) {
            if (userId) {
              await saveUserWordHistory(userId, retryWord.id)
            }

            return NextResponse.json({
              result: { type: 'word', data: transformWord(retryWord) },
              remaining: rateLimit.remaining - 1,
            })
          }

          throw new Error('단어 저장에 실패했습니다.')
        }

        if (userId && savedWord) {
          await saveUserWordHistory(userId, savedWord.id)
        }

        return NextResponse.json({
          result: { type: 'word', data: transformWord(savedWord!) },
          remaining: rateLimit.remaining - 1,
        })
      }

      case 'TYPO': {
        await logFailedSearch(normalized, 'TYPO', gatekeeperResult.correction ?? null)

        const result: SearchResult = {
          type: 'typo',
          correction: gatekeeperResult.correction || '',
          original: normalized,
        }

        return NextResponse.json({
          result,
          remaining: rateLimit.remaining - 1,
        })
      }

      case 'KOREAN': {
        await logFailedSearch(normalized, 'KOREAN', null)

        // DB에서 meanings 배열 내 한국어 검색
        const { data: koreanResults } = await supabaseAdmin
          .rpc('search_by_meaning', { search_term: normalized })

        const result: SearchResult = {
          type: 'korean',
          suggestions: (koreanResults || []).map((r: Record<string, unknown>) => transformWord(r)),
          original: normalized,
        }

        return NextResponse.json({
          result,
          remaining: rateLimit.remaining - 1,
        })
      }

      case 'LOW_VALUE': {
        await logFailedSearch(normalized, 'LOW_VALUE', null)

        const result: SearchResult = {
          type: 'low_value',
          original: normalized,
        }

        return NextResponse.json({
          result,
          reason: gatekeeperResult.reason,
          remaining: rateLimit.remaining - 1,
        })
      }

      case 'INVALID':
      default: {
        await logFailedSearch(normalized, 'INVALID', null)

        const result: SearchResult = {
          type: 'invalid',
          original: normalized,
        }

        return NextResponse.json({
          result,
          reason: gatekeeperResult.reason,
          remaining: rateLimit.remaining - 1,
        })
      }
    }
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: '검색 중 오류가 발생했습니다. 다시 시도해 주세요.' },
      { status: 500 }
    )
  }
}

// 검색 로그 기록
async function logSearch(
  sessionId: string,
  userId: string | null,
  word: string,
  status: string,
  ipAddress: string | null,
  userAgent: string | null
) {
  try {
    await supabaseAdmin.from('search_logs').insert({
      session_id: sessionId,
      user_id: userId,
      word,
      gatekeeper_status: status,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  } catch (error) {
    console.error('Failed to log search:', error)
  }
}

// 실패 검색 기록 (UPSERT)
async function logFailedSearch(
  inputText: string,
  status: string,
  correction: string | null
) {
  try {
    await supabaseAdmin.rpc('upsert_failed_search', {
      p_input_text: inputText,
      p_status: status,
      p_correction: correction,
    })
  } catch (error) {
    console.error('Failed to log failed search:', error)
  }
}

// 사용자 검색 이력 저장
async function saveUserWordHistory(userId: string, wordId: string) {
  try {
    await supabaseAdmin.from('user_word_history').insert({
      user_id: userId,
      word_id: wordId,
    })
  } catch (error) {
    // 중복 이력은 무시 (같은 단어 여러 번 검색)
    console.error('Failed to save user word history:', error)
  }
}

// DB 레코드를 Word 타입으로 변환
function transformWord(record: Record<string, unknown>): Word {
  return {
    id: record.id as string,
    word: record.word as string,
    exam_type: record.exam_type as string,
    part_of_speech: record.part_of_speech as string | null,
    pronunciation: record.pronunciation as string | null,
    meanings: (record.meanings as string[]) || [],
    image_text: record.image_text as string | null,
    description: record.description as string | null,
    description_en: (record.description_en as string | undefined) ?? null,
    teps_point: record.teps_point as string | null,
    synonyms: (record.synonyms as string[]) || [],
    antonyms: (record.antonyms as string[]) || [],
    comparisons: (record.comparisons as string[]) || [],
    paraphrasing: (record.paraphrasing as string[]) || [],
    example_sentence: record.example_sentence as string | null,
    example_translation: record.example_translation as string | null,
    difficulty_level: (record.difficulty_level as number) || 3,
    search_count: (record.search_count as number) || 0,
    created_at: record.created_at as string,
    updated_at: record.updated_at as string,
  }
}
