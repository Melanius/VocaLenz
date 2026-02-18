import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { openai } from '@/lib/openai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function buildSystemPrompt(scores: { round: string | null; listening: number | null; vocabulary: number | null; grammar: number | null; reading: number | null; total: number | null; exam_date: string | null }[]): string {
  let scoreTable = '성적 데이터 없음'

  if (scores.length > 0) {
    const rows = scores.map((s) =>
      `${s.round || '-'} | ${s.listening ?? '-'} | ${s.vocabulary ?? '-'} | ${s.grammar ?? '-'} | ${s.reading ?? '-'} | ${s.total ?? '-'} | ${s.exam_date || '-'}`
    )
    scoreTable = `회차 | 청해 | 어휘 | 문법 | 독해 | 총점 | 날짜\n${rows.join('\n')}`
  }

  return `너는 TEPS 전문 학습 코치야. 학생의 점수를 분석하고 맞춤형 학습 전략을 제시하는 역할이야.

[학생 성적 데이터]
${scoreTable}

[참고: TEPS 배점]
- 청해: 0~400점, 어휘: 0~100점, 문법: 0~100점, 독해: 0~400점, 총점: 0~1000점

[규칙]
- 첫 응답에서 목표 점수, 시험 예정일, 하루 학습 가능 시간을 질문해
- 영역별 강약점을 수치 기반으로 분석해
- 구체적이고 실행 가능한 학습 전략을 제시해
- 한국어로 답변하되 간결하고 핵심적으로 작성해
- 마크다운 서식(볼드, 리스트)을 활용해 가독성을 높여`
}

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

    const { messages } = (await request.json()) as { messages: ChatMessage[] }

    // 최근 10회 성적 조회 (오래된 순 → 추이 파악용)
    const { data: scores } = await supabaseAdmin
      .from('user_scores')
      .select('round, listening, vocabulary, grammar, reading, total, exam_date')
      .eq('user_id', user.id)
      .order('exam_date', { ascending: true })
      .limit(10)

    const systemPrompt = buildSystemPrompt(scores || [])

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
        } catch {
          // stream error
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
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
