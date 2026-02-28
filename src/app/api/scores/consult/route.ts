import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { openai } from '@/lib/openai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface GoalContext {
  targetScore: number | null
  targetDate: string | null
  studyHours: string | null
  weakAreas: string[]
  proxyLevel: string | null // 성적 없을 때 대체 정보
}

interface ScoreRow {
  round: string | null
  listening: number | null
  vocabulary: number | null
  grammar: number | null
  reading: number | null
  total: number | null
  exam_date: string | null
}

function computeTrendAnalysis(scores: ScoreRow[]): string {
  if (scores.length === 0) return '성적 데이터 없음 - 대체 정보 기반 분석 필요'
  if (scores.length === 1) return '1회 데이터만 존재하여 추이 분석 불가. 현재 점수 기준으로 분석.'

  const lines: string[] = []

  // 총점 추이 (최근 3회)
  const recent = scores.slice(-3)
  const totals = recent.map((s) => s.total ?? 0)
  if (totals.length >= 2) {
    const diff = totals[totals.length - 1] - totals[0]
    const trend = diff > 10 ? '상승세' : diff < -10 ? '하락세' : '정체'
    lines.push(`최근 ${totals.length}회 총점 추이: ${totals.join(' → ')} (${trend}, ${diff > 0 ? '+' : ''}${diff}점)`)
  }

  // 영역별 평균 및 최약 영역
  const areas = ['listening', 'vocabulary', 'grammar', 'reading'] as const
  const areaNames = { listening: '청해', vocabulary: '어휘', grammar: '문법', reading: '독해' }
  const areaMax = { listening: 240, vocabulary: 60, grammar: 60, reading: 240 }
  const avgs: Record<string, number> = {}

  for (const area of areas) {
    const vals = scores.map((s) => s[area]).filter((v): v is number => v !== null)
    if (vals.length > 0) {
      avgs[area] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    }
  }

  if (Object.keys(avgs).length > 0) {
    const avgParts = areas
      .filter((a) => avgs[a] !== undefined)
      .map((a) => `${areaNames[a]} ${avgs[a]}/${areaMax[a]}(${Math.round((avgs[a] / areaMax[a]) * 100)}%)`)
    lines.push(`영역별 평균: ${avgParts.join(', ')}`)

    // 달성률 기준 최약 영역
    let weakest: keyof typeof areaNames = areas[0]
    let lowestRate = 1
    for (const area of areas) {
      if (avgs[area] !== undefined) {
        const rate = avgs[area] / areaMax[area]
        if (rate < lowestRate) {
          lowestRate = rate
          weakest = area
        }
      }
    }
    lines.push(`가장 취약 영역: ${areaNames[weakest]} (달성률 ${Math.round(lowestRate * 100)}%)`)
  }

  // 최고점 vs 최근점
  const allTotals = scores.map((s) => s.total ?? 0)
  const maxTotal = Math.max(...allTotals)
  const latestTotal = allTotals[allTotals.length - 1]
  if (maxTotal > latestTotal) {
    lines.push(`최고점 ${maxTotal} vs 최근 ${latestTotal} (최고점 대비 -${maxTotal - latestTotal}점)`)
  }

  return lines.join('\n')
}

function buildSystemPrompt(scores: ScoreRow[], goalContext?: GoalContext): string {
  // 성적 테이블
  let scoreSection: string
  if (scores.length > 0) {
    const rows = scores.map((s) =>
      `${s.round || '-'} | ${s.listening ?? '-'} | ${s.vocabulary ?? '-'} | ${s.grammar ?? '-'} | ${s.reading ?? '-'} | ${s.total ?? '-'} | ${s.exam_date || '-'}`
    )
    scoreSection = `회차 | 청해 | 어휘 | 문법 | 독해 | 총점 | 날짜\n${rows.join('\n')}`
  } else {
    scoreSection = '성적 데이터 없음'
  }

  // 추이 분석
  const trendAnalysis = computeTrendAnalysis(scores)

  // 목표 정보
  let goalSection = '목표 정보 미입력'
  if (goalContext) {
    const parts: string[] = []
    if (goalContext.targetScore) {
      parts.push(`목표 점수: ${goalContext.targetScore}점`)
    }
    if (goalContext.targetDate) {
      const dDay = Math.ceil((new Date(goalContext.targetDate).getTime() - Date.now()) / 86400000)
      parts.push(`목표 날짜: ${goalContext.targetDate} (D-${Math.max(0, dDay)})`)
    }
    if (goalContext.studyHours) {
      parts.push(`하루 학습 시간: ${goalContext.studyHours}`)
    }
    if (goalContext.weakAreas.length > 0) {
      parts.push(`체감 취약 영역: ${goalContext.weakAreas.join(', ')}`)
    }
    if (goalContext.proxyLevel) {
      parts.push(`영어 수준 참고: ${goalContext.proxyLevel}`)
    }
    goalSection = parts.join('\n')
  }

  return `[Persona: TEPS Strategic Analyst]
너는 데이터에 기반하여 TEPS 성적을 분석하고 최단기 목표 달성 전략을 짜주는 냉철한 전략가다.
- 답변은 반드시 한국어로 하며, 불필요한 서론(반갑습니다, 응원합니다, 화이팅 등)은 생략하고 바로 본론으로 들어간다.
- 근거 없는 응원이나 막연한 조언 대신, 수치와 데이터에 기반한 냉정한 분석을 제공한다.
- 마크다운 서식(볼드, 리스트, 숫자 목록)을 활용해 가독성을 높여라.

[TEPS Knowledge Base]
- 신형 TEPS 만점: 600점 (청해: 240, 어휘: 60, 문법: 60, 독해: 240)
- 배점 비율: 청해 40%, 독해 40%, 어휘 10%, 문법 10%
- 배점 비율이 높은 영역(청해/독해)의 점수 상승이 총점 상승에 가장 효율적이다.
- TEPS 등급: 526+ (1+급), 453~525 (1급), 387~452 (2급), 316~386 (2+급), 252~315 (3급), 195~251 (3+급)

[학생 성적 데이터]
${scoreSection}

[성적 추이 분석]
${trendAnalysis}

[학생 목표]
${goalSection}

[첫 분석 답변 형식 - 반드시 이 구조를 따라라]
1. **현재 상태 진단**: 목표 점수 대비 부족한 영역별 점수 차이를 수치화하라.
2. **전략적 우선순위**: 배점 효율을 고려하여 영역별 학습 투자 비율을 제시하라. (예: 독해 50%, 청해 30%, 어휘 15%, 문법 5%)
3. **주간 학습 스케줄**: 하루 학습 시간 기반으로 구체적인 주간 학습 계획표를 제시하라.
4. **VocaLenz 활용법**: 목표 점수대에 맞는 단어 레벨(Lv.1 Essential ~ Lv.4 Killer) 추천.
5. **현실 점검(Reality Check)**: 목표 날짜와 학습 시간 대비 목표 점수의 실현 가능성을 냉정하게 평가하라. 비현실적이면 명확히 경고하고 현실적 대안을 제시하라.

[제약 조건]
- 성적 데이터가 없으면 "영어 수준 참고" 정보를 기반으로 추정 레벨을 설정하여 분석하라.
- 후속 대화에서도 데이터와 수치 기반으로 답변하라.
- 질문에 대해 짧고 핵심적으로 답변하라. 장황한 설명은 금지.`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { messages, goalContext } = (await request.json()) as {
      messages: ChatMessage[]
      goalContext?: GoalContext
    }

    // 최근 10회 성적 조회 (오래된 순 → 추이 파악용)
    const { data: scores } = await supabaseAdmin
      .from('user_scores')
      .select('round, listening, vocabulary, grammar, reading, total, exam_date')
      .eq('user_id', user.id)
      .order('exam_date', { ascending: true })
      .limit(10)

    const systemPrompt = buildSystemPrompt(scores || [], goalContext)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1500,
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
