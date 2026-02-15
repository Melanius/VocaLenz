import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/event-logger'

interface QuizAnswer {
  word: string
  correct: boolean
  timeMs: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, answers, total, correct, score, avgTimeMs } = body as {
      sessionId: string
      answers: QuizAnswer[]
      total: number
      correct: number
      score: number
      avgTimeMs: number
    }

    if (!sessionId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    // 사용자 인증 확인 (선택적)
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // 각 답변을 quiz_answer 이벤트로 기록
    for (const answer of answers) {
      logEvent({
        sessionId,
        userId,
        page: '/quiz',
        action: 'quiz_answer',
        metadata: {
          word: answer.word,
          correct: answer.correct,
          timeMs: answer.timeMs,
        },
      })
    }

    // 전체 결과를 quiz_complete 이벤트로 기록
    logEvent({
      sessionId,
      userId,
      page: '/quiz',
      action: 'quiz_complete',
      metadata: { total, correct, score, avgTimeMs },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
