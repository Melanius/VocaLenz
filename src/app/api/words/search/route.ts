import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { evaluateWithGatekeeper } from '@/lib/gatekeeper'
import { generateWordData } from '@/lib/word-generator'
import { generateExpressionData } from '@/lib/expression-generator'
import { checkRateLimit } from '@/lib/rate-limit'
import { logEvent } from '@/lib/event-logger'
import type { Word, Expression, SearchResult, SearchMode } from '@/types/database'

// 입력 정규화
function normalizeInput(raw: string): string {
  const trimmed = raw.trim().slice(0, 100)
  return trimmed.toLowerCase().replace(/\s+/g, ' ')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input, sessionId, mode: requestedMode } = body
    const mode: SearchMode = requestedMode === 'expression' ? 'expression' : 'word'

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

    const normalized = normalizeInput(input)
    if (!normalized) {
      return NextResponse.json(
        { error: '유효한 검색어를 입력해 주세요.' },
        { status: 400 }
      )
    }

    // 사용자 인증 확인
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
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

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
    const ua = request.headers.get('user-agent') || null

    // 1. 요청 모드의 DB 조회
    if (mode === 'word') {
      const { data: existingWord } = await supabaseAdmin
        .from('words')
        .select('*')
        .eq('word', normalized)
        .eq('exam_type', 'TEPS')
        .single()

      if (existingWord) {
        await supabaseAdmin.rpc('increment_search_count', { word_id: existingWord.id })
        await logSearch(sessionId, userId, normalized, 'WORD', ip, ua)
        logEvent({ sessionId, userId, page: '/search', action: 'word_search', metadata: { word: normalized, status: 'WORD', mode, ip, ua } })
        if (userId) await saveUserWordHistory(userId, existingWord.id)

        return NextResponse.json({
          result: { type: 'word', data: transformWord(existingWord) } as SearchResult,
          remaining: rateLimit.remaining - 1,
          autoRouted: false,
          actualMode: 'word',
        })
      }
    } else {
      const { data: existingExpr } = await supabaseAdmin
        .from('expressions')
        .select('*')
        .eq('expression', normalized)
        .eq('exam_type', 'TEPS')
        .single()

      if (existingExpr) {
        await supabaseAdmin.from('expressions').update({ search_count: (existingExpr.search_count || 0) + 1 }).eq('id', existingExpr.id)
        await logSearch(sessionId, userId, normalized, 'PHRASE', ip, ua)
        logEvent({ sessionId, userId, page: '/search', action: 'expression_search', metadata: { expression: normalized, status: 'PHRASE', mode, ip, ua } })
        if (userId) await saveUserExpressionHistory(userId, existingExpr.id)

        return NextResponse.json({
          result: { type: 'expression', data: transformExpression(existingExpr) } as SearchResult,
          remaining: rateLimit.remaining - 1,
          autoRouted: false,
          actualMode: 'expression',
        })
      }
    }

    // 2. 반대 테이블도 조회 (이미 다른 카테고리에 있을 수 있음)
    if (mode === 'word') {
      const { data: crossExpr } = await supabaseAdmin
        .from('expressions')
        .select('*')
        .eq('expression', normalized)
        .eq('exam_type', 'TEPS')
        .single()

      if (crossExpr) {
        await supabaseAdmin.from('expressions').update({ search_count: (crossExpr.search_count || 0) + 1 }).eq('id', crossExpr.id)
        await logSearch(sessionId, userId, normalized, 'PHRASE', ip, ua)
        if (userId) await saveUserExpressionHistory(userId, crossExpr.id)

        return NextResponse.json({
          result: { type: 'expression', data: transformExpression(crossExpr) } as SearchResult,
          remaining: rateLimit.remaining - 1,
          autoRouted: true,
          actualMode: 'expression',
        })
      }
    } else {
      const { data: crossWord } = await supabaseAdmin
        .from('words')
        .select('*')
        .eq('word', normalized)
        .eq('exam_type', 'TEPS')
        .single()

      if (crossWord) {
        await supabaseAdmin.rpc('increment_search_count', { word_id: crossWord.id })
        await logSearch(sessionId, userId, normalized, 'WORD', ip, ua)
        if (userId) await saveUserWordHistory(userId, crossWord.id)

        return NextResponse.json({
          result: { type: 'word', data: transformWord(crossWord) } as SearchResult,
          remaining: rateLimit.remaining - 1,
          autoRouted: true,
          actualMode: 'word',
        })
      }
    }

    // 3. Gatekeeper 평가
    const gatekeeperResult = await evaluateWithGatekeeper(normalized)
    await logSearch(sessionId, userId, normalized, gatekeeperResult.status, ip, ua)
    logEvent({ sessionId, userId, page: '/search', action: 'search', metadata: { input: normalized, status: gatekeeperResult.status, mode, ip, ua } })

    // 4. Gatekeeper 결과에 따른 처리
    switch (gatekeeperResult.status) {
      case 'WORD': {
        const wordData = await generateWordData(normalized)
        const { data: savedWord, error: saveError } = await supabaseAdmin
          .from('words')
          .upsert({
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
          }, { onConflict: 'word,exam_type', ignoreDuplicates: false })
          .select()
          .single()

        if (saveError) {
          const { data: retryWord } = await supabaseAdmin
            .from('words').select('*').eq('word', normalized).eq('exam_type', 'TEPS').single()
          if (retryWord) {
            if (userId) await saveUserWordHistory(userId, retryWord.id)
            return NextResponse.json({
              result: { type: 'word', data: transformWord(retryWord) },
              remaining: rateLimit.remaining - 1,
              autoRouted: mode !== 'word',
              actualMode: 'word',
            })
          }
          throw new Error('단어 저장에 실패했습니다.')
        }

        if (userId && savedWord) await saveUserWordHistory(userId, savedWord.id)
        return NextResponse.json({
          result: { type: 'word', data: transformWord(savedWord!) },
          remaining: rateLimit.remaining - 1,
          autoRouted: mode !== 'word',
          actualMode: 'word',
        })
      }

      case 'PHRASE': {
        const exprData = await generateExpressionData(normalized)
        const { data: savedExpr, error: saveError } = await supabaseAdmin
          .from('expressions')
          .upsert({
            expression: normalized,
            exam_type: 'TEPS',
            meanings: exprData.meanings,
            description: exprData.description,
            teps_point: exprData.teps_point,
            context: exprData.context,
            pronunciation_tip: exprData.pronunciation_tip,
            listening_parts: exprData.listening_parts,
            paraphrasing: exprData.paraphrasing,
            comparisons: exprData.comparisons,
            example_sentence: exprData.example_sentence,
            example_translation: exprData.example_translation,
            difficulty_level: exprData.difficulty_level,
            search_count: 1,
          }, { onConflict: 'expression,exam_type', ignoreDuplicates: false })
          .select()
          .single()

        if (saveError) {
          const { data: retryExpr } = await supabaseAdmin
            .from('expressions').select('*').eq('expression', normalized).eq('exam_type', 'TEPS').single()
          if (retryExpr) {
            if (userId) await saveUserExpressionHistory(userId, retryExpr.id)
            return NextResponse.json({
              result: { type: 'expression', data: transformExpression(retryExpr) },
              remaining: rateLimit.remaining - 1,
              autoRouted: mode !== 'expression',
              actualMode: 'expression',
            })
          }
          throw new Error('표현 저장에 실패했습니다.')
        }

        if (userId && savedExpr) await saveUserExpressionHistory(userId, savedExpr.id)
        return NextResponse.json({
          result: { type: 'expression', data: transformExpression(savedExpr!) },
          remaining: rateLimit.remaining - 1,
          autoRouted: mode !== 'expression',
          actualMode: 'expression',
        })
      }

      case 'TYPO': {
        await logFailedSearch(normalized, 'TYPO', gatekeeperResult.correction ?? null)
        return NextResponse.json({
          result: { type: 'typo', correction: gatekeeperResult.correction || '', original: normalized } as SearchResult,
          remaining: rateLimit.remaining - 1,
          autoRouted: false,
          actualMode: mode,
        })
      }

      case 'KOREAN': {
        await logFailedSearch(normalized, 'KOREAN', null)
        const { data: koreanResults } = await supabaseAdmin.rpc('search_by_meaning', { search_term: normalized })
        return NextResponse.json({
          result: { type: 'korean', suggestions: (koreanResults || []).map((r: Record<string, unknown>) => transformWord(r)), original: normalized } as SearchResult,
          remaining: rateLimit.remaining - 1,
          autoRouted: false,
          actualMode: mode,
        })
      }

      case 'LOW_VALUE': {
        await logFailedSearch(normalized, 'LOW_VALUE', null)
        return NextResponse.json({
          result: { type: 'low_value', original: normalized } as SearchResult,
          reason: gatekeeperResult.reason,
          remaining: rateLimit.remaining - 1,
          autoRouted: false,
          actualMode: mode,
        })
      }

      case 'INVALID':
      default: {
        await logFailedSearch(normalized, 'INVALID', null)
        return NextResponse.json({
          result: { type: 'invalid', original: normalized } as SearchResult,
          reason: gatekeeperResult.reason,
          remaining: rateLimit.remaining - 1,
          autoRouted: false,
          actualMode: mode,
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

// --- Helper functions ---

async function logSearch(sessionId: string, userId: string | null, word: string, status: string, ipAddress: string | null, userAgent: string | null) {
  try {
    await supabaseAdmin.from('search_logs').insert({ session_id: sessionId, user_id: userId, word, gatekeeper_status: status, ip_address: ipAddress, user_agent: userAgent })
  } catch (error) { console.error('Failed to log search:', error) }
}

async function logFailedSearch(inputText: string, status: string, correction: string | null) {
  try {
    await supabaseAdmin.rpc('upsert_failed_search', { p_input_text: inputText, p_status: status, p_correction: correction })
  } catch (error) { console.error('Failed to log failed search:', error) }
}

async function saveUserWordHistory(userId: string, wordId: string) {
  try {
    await supabaseAdmin.from('user_word_history').insert({ user_id: userId, word_id: wordId })
  } catch (error) { console.error('Failed to save user word history:', error) }
}

async function saveUserExpressionHistory(userId: string, expressionId: string) {
  try {
    await supabaseAdmin.from('user_expression_history').insert({ user_id: userId, expression_id: expressionId })
  } catch (error) { console.error('Failed to save user expression history:', error) }
}

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

function transformExpression(record: Record<string, unknown>): Expression {
  return {
    id: record.id as string,
    expression: record.expression as string,
    exam_type: record.exam_type as string,
    meanings: (record.meanings as string[]) || [],
    description: record.description as string | null,
    teps_point: record.teps_point as string | null,
    context: record.context as string | null,
    pronunciation_tip: record.pronunciation_tip as string | null,
    listening_parts: (record.listening_parts as string[]) || [],
    paraphrasing: (record.paraphrasing as string[]) || [],
    comparisons: (record.comparisons as string[]) || [],
    example_sentence: record.example_sentence as string | null,
    example_translation: record.example_translation as string | null,
    difficulty_level: (record.difficulty_level as number) || 2,
    search_count: (record.search_count as number) || 0,
    created_at: record.created_at as string,
    updated_at: record.updated_at as string,
  }
}
