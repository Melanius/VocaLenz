import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

// POST: 사용자 수정 제안 제출
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { wordId, expressionId, type, currentMeanings, suggestedMeaning } = await request.json()

    if (!type || (type !== 'word' && type !== 'expression')) {
      return NextResponse.json({ error: '유효하지 않은 type입니다.' }, { status: 400 })
    }
    if (!wordId && !expressionId) {
      return NextResponse.json({ error: 'wordId 또는 expressionId가 필요합니다.' }, { status: 400 })
    }
    if (!suggestedMeaning?.trim()) {
      return NextResponse.json({ error: '제안 내용을 입력해 주세요.' }, { status: 400 })
    }
    if (!Array.isArray(currentMeanings) || currentMeanings.length === 0) {
      return NextResponse.json({ error: '현재 뜻 정보가 필요합니다.' }, { status: 400 })
    }

    // 중복 pending 제안 방지
    const dupQuery = wordId
      ? supabaseAdmin
          .from('meaning_correction_requests')
          .select('id')
          .eq('user_id', user.id)
          .eq('word_id', wordId)
          .eq('status', 'pending')
          .maybeSingle()
      : supabaseAdmin
          .from('meaning_correction_requests')
          .select('id')
          .eq('user_id', user.id)
          .eq('expression_id', expressionId)
          .eq('status', 'pending')
          .maybeSingle()

    const { data: existing } = await dupQuery
    if (existing) {
      return NextResponse.json(
        { error: '이미 검토 중인 수정 제안이 있습니다.', code: 'DUPLICATE' },
        { status: 409 }
      )
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      type,
      current_meanings: currentMeanings,
      suggested_meaning: suggestedMeaning.trim(),
      status: 'pending',
    }
    if (wordId) insertData.word_id = wordId
    else insertData.expression_id = expressionId

    const { data, error } = await supabaseAdmin
      .from('meaning_correction_requests')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '제안 등록에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// GET: 관리자 전용 목록 조회
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = 20
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('meaning_correction_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') query = query.eq('status', status)

    const { data: rows, count, error } = await query

    if (error) {
      return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ requests: [], total: 0, totalPages: 0 })
    }

    // 단어/표현 이름 조회
    const wordIds = rows.filter((r) => r.word_id).map((r) => r.word_id as string)
    const exprIds = rows.filter((r) => r.expression_id).map((r) => r.expression_id as string)
    const userIds = [...new Set(rows.map((r) => r.user_id as string))]

    const [wordsRes, exprsRes, usersRes] = await Promise.all([
      wordIds.length > 0
        ? supabaseAdmin.from('words').select('id, word').in('id', wordIds)
        : { data: [] },
      exprIds.length > 0
        ? supabaseAdmin.from('expressions').select('id, expression').in('id', exprIds)
        : { data: [] },
      userIds.length > 0
        ? supabaseAdmin.from('users').select('id, email, nickname').in('id', userIds)
        : { data: [] },
    ])

    const wordMap = Object.fromEntries((wordsRes.data || []).map((w) => [w.id, w.word]))
    const exprMap = Object.fromEntries((exprsRes.data || []).map((e) => [e.id, e.expression]))
    const userMap = Object.fromEntries(
      (usersRes.data || []).map((u) => [u.id, { email: u.email, nickname: u.nickname }])
    )

    const requests = rows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.word_id ? wordMap[r.word_id] : exprMap[r.expression_id],
      entityId: r.word_id || r.expression_id,
      currentMeanings: r.current_meanings,
      suggestedMeaning: r.suggested_meaning,
      status: r.status,
      adminReason: r.admin_reason,
      requesterEmail: userMap[r.user_id]?.email || '',
      requesterName: userMap[r.user_id]?.nickname || null,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    }))

    return NextResponse.json({
      requests,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
