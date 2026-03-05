import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateExpressionData } from '@/lib/expression-generator'

const KOREAN_REGEX = /[가-힣]/

/** paraphrasing 배열에 한글이 하나라도 포함되어 있으면 true */
function hasKoreanParaphrasing(paraphrasing: string[] | null): boolean {
  if (!paraphrasing || paraphrasing.length === 0) return false
  return paraphrasing.some((p) => KOREAN_REGEX.test(p))
}

/** 수정이 필요한 expressions 목록 조회 */
async function fetchBrokenExpressions(): Promise<{ id: string; expression: string; reasons: string[] }[]> {
  const PAGE_SIZE = 1000
  const results: { id: string; expression: string; image_text: string | null; paraphrasing: string[] }[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('expressions')
      .select('id, expression, image_text, paraphrasing')
      .range(from, from + PAGE_SIZE - 1)

    if (error || !data || data.length === 0) break
    results.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return results
    .filter((e) => !e.image_text || e.image_text.trim() === '' || hasKoreanParaphrasing(e.paraphrasing))
    .map((e) => {
      const reasons: string[] = []
      if (!e.image_text || e.image_text.trim() === '') reasons.push('image_text 없음')
      if (hasKoreanParaphrasing(e.paraphrasing)) reasons.push('paraphrasing 한글')
      return { id: e.id, expression: e.expression, reasons }
    })
}

/** GET: 수정 필요한 expressions 개수 + 목록 미리보기 */
export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const broken = await fetchBrokenExpressions()
  return new Response(
    JSON.stringify({
      total: broken.length,
      preview: broken.slice(0, 20).map((e) => ({ expression: e.expression, reasons: e.reasons })),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}

/** POST: NDJSON 스트리밍으로 수정 진행 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // POST body에서 ids를 받으면 해당 목록만, 없으면 전체 자동 감지
  let targetIds: string[] | null = null
  try {
    const body = await request.json().catch(() => ({}))
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      targetIds = body.ids as string[]
    }
  } catch {
    // ignore
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))

      try {
        // 수정 대상 조회
        let targets: { id: string; expression: string; reasons: string[] }[]
        if (targetIds) {
          const { data } = await supabaseAdmin
            .from('expressions')
            .select('id, expression, image_text, paraphrasing')
            .in('id', targetIds)
          targets = (data || [])
            .filter((e) => !e.image_text || e.image_text.trim() === '' || hasKoreanParaphrasing(e.paraphrasing))
            .map((e) => {
              const reasons: string[] = []
              if (!e.image_text || e.image_text.trim() === '') reasons.push('image_text 없음')
              if (hasKoreanParaphrasing(e.paraphrasing)) reasons.push('paraphrasing 한글')
              return { id: e.id, expression: e.expression, reasons }
            })
        } else {
          targets = await fetchBrokenExpressions()
        }

        const total = targets.length
        send({ type: 'start', total })

        let fixed = 0
        let failed = 0

        for (let i = 0; i < targets.length; i++) {
          const { id, expression, reasons } = targets[i]
          send({ type: 'progress', current: i + 1, total, expression, status: 'processing', reasons })

          try {
            const newData = await generateExpressionData(expression)

            const { error } = await supabaseAdmin
              .from('expressions')
              .update({
                image_text: newData.image_text || null,
                paraphrasing: newData.paraphrasing,
                // 전체 필드도 최신으로 업데이트
                meanings: newData.meanings,
                description: newData.description,
                teps_point: newData.teps_point,
                context: newData.context,
                pronunciation_tip: newData.pronunciation_tip,
                listening_parts: newData.listening_parts,
                comparisons: newData.comparisons,
                example_sentence: newData.example_sentence,
                example_translation: newData.example_translation,
              })
              .eq('id', id)

            if (error) throw error

            fixed++
            send({ type: 'progress', current: i + 1, total, expression, status: 'fixed', reasons })
          } catch (err) {
            failed++
            send({
              type: 'progress',
              current: i + 1,
              total,
              expression,
              status: 'failed',
              error: err instanceof Error ? err.message : '알 수 없는 오류',
            })
          }
        }

        send({ type: 'complete', total, fixed, failed })
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : '서버 오류' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  })
}
