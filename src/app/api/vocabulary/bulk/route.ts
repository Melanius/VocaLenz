import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateWordData } from '@/lib/word-generator'
import { generateExpressionData } from '@/lib/expression-generator'
import { evaluateWithGatekeeper } from '@/lib/gatekeeper'
import { logEvent } from '@/lib/event-logger'

const MAX_VOCABULARY_SIZE = 2000

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { words, sessionId, uploadType = 'word' } = await request.json() as {
      words: string[]
      sessionId?: string
      uploadType?: 'word' | 'expression'
    }

    if (!words || !Array.isArray(words) || words.length === 0) {
      return new Response(JSON.stringify({ error: '단어 목록이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isExpression = uploadType === 'expression'
    const listName = isExpression ? 'Lenz 픽' : 'Voca 리스트'
    const vocabTable = isExpression ? 'user_expression_vocabulary' : 'user_vocabulary'

    // 잔여 용량 체크
    const { count: currentCount } = await supabaseAdmin
      .from(vocabTable)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const remaining = MAX_VOCABULARY_SIZE - (currentCount || 0)
    if (remaining <= 0) {
      return new Response(JSON.stringify({ error: `${listName}가 가득 찼습니다. (최대 2000개)` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const wordsToProcess = words.slice(0, Math.min(words.length, remaining))
    const total = wordsToProcess.length

    // NDJSON 스트리밍 응답
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let added = 0
        let skipped = 0
        let failed = 0

        for (let i = 0; i < wordsToProcess.length; i++) {
          const word = wordsToProcess[i].trim().toLowerCase()

          try {
            if (isExpression) {
              // --- Lenz 픽 (expressions 테이블) ---
              const { data: existingExpr } = await supabaseAdmin
                .from('expressions')
                .select('id')
                .ilike('expression', word)
                .single()

              if (existingExpr) {
                const { data: existingVocab } = await supabaseAdmin
                  .from('user_expression_vocabulary')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('expression_id', existingExpr.id)
                  .single()

                if (existingVocab) {
                  skipped++
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'skipped' }) + '\n'
                  ))
                } else {
                  await supabaseAdmin
                    .from('user_expression_vocabulary')
                    .insert({ user_id: user.id, expression_id: existingExpr.id })
                  added++
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'added' }) + '\n'
                  ))
                }
              } else {
                controller.enqueue(encoder.encode(
                  JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'generating' }) + '\n'
                ))
                try {
                  const gkResult = await evaluateWithGatekeeper(word)
                  if (gkResult.status !== 'WORD' && gkResult.status !== 'PHRASE') {
                    failed++
                    controller.enqueue(encoder.encode(
                      JSON.stringify({
                        type: 'progress', current: i + 1, total, word, status: 'failed',
                        error: gkResult.reason || '유효하지 않은 입력',
                        correction: gkResult.correction,
                        gkStatus: gkResult.status,
                      }) + '\n'
                    ))
                    continue
                  }
                  const exprData = await generateExpressionData(word)
                  const { data: newExpr, error: insertError } = await supabaseAdmin
                    .from('expressions')
                    .insert({
                      expression: word,
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
                    })
                    .select('id')
                    .single()
                  if (insertError || !newExpr) throw new Error('구문 저장 실패')
                  await supabaseAdmin
                    .from('user_expression_vocabulary')
                    .insert({ user_id: user.id, expression_id: newExpr.id })
                  added++
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'added' }) + '\n'
                  ))
                } catch {
                  failed++
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'failed', error: '구문 생성 실패' }) + '\n'
                  ))
                }
              }
            } else {
              // --- Voca 리스트 (words 테이블) ---
              const { data: existingWord } = await supabaseAdmin
                .from('words')
                .select('id')
                .ilike('word', word)
                .single()

              if (existingWord) {
                const { data: existingVocab } = await supabaseAdmin
                  .from('user_vocabulary')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('word_id', existingWord.id)
                  .single()

                if (existingVocab) {
                  skipped++
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'skipped' }) + '\n'
                  ))
                } else {
                  await supabaseAdmin
                    .from('user_vocabulary')
                    .insert({ user_id: user.id, word_id: existingWord.id })
                  added++
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'added' }) + '\n'
                  ))
                }
              } else {
                controller.enqueue(encoder.encode(
                  JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'generating' }) + '\n'
                ))
                try {
                  const gkResult = await evaluateWithGatekeeper(word)
                  if (gkResult.status !== 'WORD' && gkResult.status !== 'PHRASE') {
                    failed++
                    controller.enqueue(encoder.encode(
                      JSON.stringify({
                        type: 'progress', current: i + 1, total, word, status: 'failed',
                        error: gkResult.reason || '유효하지 않은 단어',
                        correction: gkResult.correction,
                        gkStatus: gkResult.status,
                      }) + '\n'
                    ))
                    continue
                  }
                  const wordData = await generateWordData(word)
                  const { data: newWord, error: insertError } = await supabaseAdmin
                    .from('words')
                    .insert({
                      word: wordData.word,
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
                    })
                    .select('id')
                    .single()
                  if (insertError || !newWord) throw new Error('단어 저장 실패')
                  await supabaseAdmin
                    .from('user_vocabulary')
                    .insert({ user_id: user.id, word_id: newWord.id })
                  added++
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'added' }) + '\n'
                  ))
                } catch {
                  failed++
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'failed', error: '단어 생성 실패' }) + '\n'
                  ))
                }
              }
            }
          } catch {
            failed++
            controller.enqueue(encoder.encode(
              JSON.stringify({ type: 'progress', current: i + 1, total, word, status: 'failed', error: '처리 중 오류' }) + '\n'
            ))
          }
        }

        controller.enqueue(encoder.encode(
          JSON.stringify({ type: 'complete', added, skipped, failed }) + '\n'
        ))

        if (sessionId) {
          logEvent({
            sessionId,
            userId: user.id,
            page: '/vocabulary',
            action: isExpression ? 'lenz_pick_bulk' : 'voca_list_bulk',
            metadata: { total, added, skipped, failed, uploadType },
          })
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
