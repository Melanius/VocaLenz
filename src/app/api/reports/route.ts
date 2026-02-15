import { NextRequest, NextResponse } from 'next/server'
import { logEvent } from '@/lib/event-logger'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, word, reason, gkStatus } = await request.json()

    if (!sessionId || !word) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    logEvent({
      sessionId,
      page: '/search',
      action: 'word_report',
      metadata: {
        word,
        reason: reason || '사용자 신고',
        gk_status: gkStatus || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
