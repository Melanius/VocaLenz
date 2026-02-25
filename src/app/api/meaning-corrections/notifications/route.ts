import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ notifications: [] })
    }

    const { data: rows, error } = await supabaseAdmin
      .from('meaning_correction_requests')
      .select('id, type, word_id, expression_id, status, admin_reason, current_meanings, suggested_meaning, resolved_at')
      .eq('user_id', user.id)
      .eq('notified', false)
      .neq('status', 'pending')
      .order('resolved_at', { ascending: false })

    if (error || !rows?.length) {
      return NextResponse.json({ notifications: [] })
    }

    // 단어/표현 이름 조회
    const wordIds = rows.filter((r) => r.word_id).map((r) => r.word_id as string)
    const exprIds = rows.filter((r) => r.expression_id).map((r) => r.expression_id as string)

    const [wordsRes, exprsRes] = await Promise.all([
      wordIds.length > 0
        ? supabaseAdmin.from('words').select('id, word').in('id', wordIds)
        : { data: [] },
      exprIds.length > 0
        ? supabaseAdmin.from('expressions').select('id, expression').in('id', exprIds)
        : { data: [] },
    ])

    const wordMap = Object.fromEntries((wordsRes.data || []).map((w) => [w.id, w.word]))
    const exprMap = Object.fromEntries((exprsRes.data || []).map((e) => [e.id, e.expression]))

    // 알림 읽음 처리
    const ids = rows.map((r) => r.id)
    await supabaseAdmin
      .from('meaning_correction_requests')
      .update({ notified: true })
      .in('id', ids)

    const notifications = rows.map((r) => ({
      id: r.id,
      status: r.status as 'approved' | 'rejected',
      type: r.type as 'word' | 'expression',
      name: r.word_id ? wordMap[r.word_id] : exprMap[r.expression_id],
      adminReason: r.admin_reason,
    }))

    return NextResponse.json({ notifications })
  } catch {
    return NextResponse.json({ notifications: [] })
  }
}
