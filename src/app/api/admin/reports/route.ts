import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

// 사용자 단어 신고 목록 조회
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('access_logs')
    .select('*', { count: 'exact' })
    .eq('action', 'word_report')

  if (status !== 'all') {
    // metadata에 resolved 여부 필터
    if (status === 'pending') {
      query = query.or('metadata->>resolved.is.null,metadata->>resolved.eq.false')
    } else if (status === 'resolved') {
      query = query.eq('metadata->>resolved', 'true')
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: '신고 목록 조회 실패' }, { status: 500 })
  }

  return NextResponse.json({
    reports: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  })
}

// 신고 처리 완료
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: '신고 ID가 필요합니다.' }, { status: 400 })
  }

  // 기존 metadata를 가져와서 resolved 추가
  const { data: existing } = await supabaseAdmin
    .from('access_logs')
    .select('metadata')
    .eq('id', id)
    .single()

  const updatedMetadata = {
    ...(existing?.metadata as Record<string, unknown> || {}),
    resolved: true,
    resolved_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from('access_logs')
    .update({ metadata: updatedMetadata })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: '처리 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
