import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  let query = supabaseAdmin
    .from('level_change_requests')
    .select('id, status, current_level, requested_level, admin_reason, word_id, expression_id, user_id, created_at, resolved_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: requests, count, error } = await query

  if (error) {
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 })
  }

  if (!requests || requests.length === 0) {
    return NextResponse.json({ requests: [], total: 0, totalPages: 0 })
  }

  // 단어/구문 이름 조회
  const wordIds = requests.filter((r) => r.word_id).map((r) => r.word_id as string)
  const exprIds = requests.filter((r) => r.expression_id).map((r) => r.expression_id as string)
  const userIds = [...new Set(requests.map((r) => r.user_id))]

  const [wordsRes, exprsRes, usersRes] = await Promise.all([
    wordIds.length > 0
      ? supabaseAdmin.from('words').select('id, word, difficulty_level').in('id', wordIds)
      : Promise.resolve({ data: [] }),
    exprIds.length > 0
      ? supabaseAdmin.from('expressions').select('id, expression, difficulty_level').in('id', exprIds)
      : Promise.resolve({ data: [] }),
    supabaseAdmin.from('users').select('id, email, name').in('id', userIds),
  ])

  type WordRow = { id: string; word: string; difficulty_level: number }
  type ExprRow = { id: string; expression: string; difficulty_level: number }
  type UserRow = { id: string; email: string; name: string | null }

  const wordMap = Object.fromEntries(
    (wordsRes.data || []).map((w: WordRow) => [w.id, w])
  )
  const exprMap = Object.fromEntries(
    (exprsRes.data || []).map((e: ExprRow) => [e.id, e])
  )
  const userMap = Object.fromEntries(
    (usersRes.data || []).map((u: UserRow) => [u.id, u])
  )

  const enriched = requests.map((r) => {
    const wordInfo = r.word_id ? wordMap[r.word_id] : null
    const exprInfo = r.expression_id ? exprMap[r.expression_id] : null
    const userInfo = userMap[r.user_id]
    return {
      id: r.id,
      status: r.status,
      currentLevel: r.current_level,
      requestedLevel: r.requested_level,
      adminReason: r.admin_reason,
      wordId: r.word_id,
      expressionId: r.expression_id,
      type: r.word_id ? 'word' : 'expression',
      name: wordInfo?.word ?? exprInfo?.expression ?? '(알 수 없음)',
      actualCurrentLevel: wordInfo?.difficulty_level ?? exprInfo?.difficulty_level ?? r.current_level,
      requesterEmail: userInfo?.email ?? r.user_id.slice(0, 8) + '...',
      requesterName: userInfo?.name ?? null,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    }
  })

  return NextResponse.json({
    requests: enriched,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  })
}
