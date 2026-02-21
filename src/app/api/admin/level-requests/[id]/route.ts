import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

const VALID_LEVELS = [1, 2, 3, 4]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const { action, reason } = await request.json()

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: '유효하지 않은 action입니다.' }, { status: 400 })
  }

  // 요청 조회
  const { data: req, error: fetchError } = await supabaseAdmin
    .from('level_change_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (fetchError || !req) {
    return NextResponse.json({ error: '요청을 찾을 수 없거나 이미 처리됐습니다.' }, { status: 404 })
  }

  if (action === 'approve') {
    const newLevel = req.requested_level
    if (!VALID_LEVELS.includes(newLevel)) {
      return NextResponse.json({ error: '유효하지 않은 레벨입니다.' }, { status: 400 })
    }

    // 단어/표현 레벨 업데이트
    if (req.word_id) {
      const { error } = await supabaseAdmin
        .from('words')
        .update({ difficulty_level: newLevel })
        .eq('id', req.word_id)
      if (error) return NextResponse.json({ error: '레벨 업데이트 실패' }, { status: 500 })
    } else if (req.expression_id) {
      const { error } = await supabaseAdmin
        .from('expressions')
        .update({ difficulty_level: newLevel })
        .eq('id', req.expression_id)
      if (error) return NextResponse.json({ error: '레벨 업데이트 실패' }, { status: 500 })
    }

    // 요청 상태 업데이트
    await supabaseAdmin
      .from('level_change_requests')
      .update({
        status: 'approved',
        admin_id: auth.userId,
        notified: false,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
  } else {
    // reject
    await supabaseAdmin
      .from('level_change_requests')
      .update({
        status: 'rejected',
        admin_reason: reason?.trim() || null,
        admin_id: auth.userId,
        notified: false,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  return NextResponse.json({ success: true })
}
