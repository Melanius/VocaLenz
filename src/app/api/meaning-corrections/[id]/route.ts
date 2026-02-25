import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params
    const { action, adminReason } = await request.json()

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: '유효하지 않은 action입니다.' }, { status: 400 })
    }

    const { data: req, error: fetchError } = await supabaseAdmin
      .from('meaning_correction_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !req) {
      return NextResponse.json({ error: '요청을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (req.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 요청입니다.' }, { status: 409 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('meaning_correction_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_reason: adminReason || null,
        resolved_at: new Date().toISOString(),
        notified: false,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: '상태 업데이트에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
