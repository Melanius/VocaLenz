import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ notifications: [] })

    // 처리 완료된 미열람 알림 조회
    const { data: requests } = await supabaseAdmin
      .from('level_change_requests')
      .select('id, status, current_level, requested_level, admin_reason, word_id, expression_id')
      .eq('user_id', user.id)
      .eq('notified', false)
      .neq('status', 'pending')
      .order('resolved_at', { ascending: false })

    if (!requests || requests.length === 0) {
      return NextResponse.json({ notifications: [] })
    }

    // 단어/구문 이름 조회
    const wordIds = requests.filter((r) => r.word_id).map((r) => r.word_id as string)
    const exprIds = requests.filter((r) => r.expression_id).map((r) => r.expression_id as string)

    const [wordsRes, exprsRes] = await Promise.all([
      wordIds.length > 0
        ? supabaseAdmin.from('words').select('id, word').in('id', wordIds)
        : Promise.resolve({ data: [] }),
      exprIds.length > 0
        ? supabaseAdmin.from('expressions').select('id, expression').in('id', exprIds)
        : Promise.resolve({ data: [] }),
    ])

    const wordMap = Object.fromEntries(
      (wordsRes.data || []).map((w: { id: string; word: string }) => [w.id, w.word])
    )
    const exprMap = Object.fromEntries(
      (exprsRes.data || []).map((e: { id: string; expression: string }) => [e.id, e.expression])
    )

    // 알림 읽음 처리
    const ids = requests.map((r) => r.id)
    await supabaseAdmin
      .from('level_change_requests')
      .update({ notified: true })
      .in('id', ids)

    return NextResponse.json({
      notifications: requests.map((r) => ({
        id: r.id,
        status: r.status as 'approved' | 'rejected',
        currentLevel: r.current_level,
        requestedLevel: r.requested_level,
        adminReason: r.admin_reason,
        name: r.word_id ? (wordMap[r.word_id] ?? '(알 수 없음)') : (exprMap[r.expression_id!] ?? '(알 수 없음)'),
        type: r.word_id ? 'word' : 'expression',
      })),
    })
  } catch {
    return NextResponse.json({ notifications: [] })
  }
}
