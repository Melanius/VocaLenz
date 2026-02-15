import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface ClientEvent {
  sessionId: string
  page: string
  action: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { events } = body as { events: ClientEvent[] }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: '이벤트가 필요합니다.' }, { status: 400 })
    }

    // 최대 50개로 제한
    const validEvents = events.slice(0, 50).filter(
      (e) => e.sessionId && e.action
    )

    if (validEvents.length === 0) {
      return NextResponse.json({ error: '유효한 이벤트가 없습니다.' }, { status: 400 })
    }

    // bulk insert (fire-and-forget)
    const rows = validEvents.map((e) => ({
      session_id: e.sessionId,
      page: e.page || '/',
      action: e.action,
      metadata: e.metadata ?? null,
    }))

    const { error } = await supabaseAdmin
      .from('access_logs')
      .insert(rows)

    if (error) {
      console.error('Failed to insert analytics events:', error)
    }

    return NextResponse.json({ success: true, count: validEvents.length })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
