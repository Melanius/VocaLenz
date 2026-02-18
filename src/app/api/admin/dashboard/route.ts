import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  // 병렬 조회
  const [usersRes, wordsRes, searchesRes, newUsersRes] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('words').select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('search_logs')
      .select('*', { count: 'exact', head: true })
      .gte('searched_at', todayISO),
    supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO),
  ])

  // 최근 검색어 10개
  const { data: recentSearches } = await supabaseAdmin
    .from('search_logs')
    .select('word, searched_at')
    .order('searched_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    totalUsers: usersRes.count || 0,
    totalWords: wordsRes.count || 0,
    todaySearches: searchesRes.count || 0,
    newUsersToday: newUsersRes.count || 0,
    recentSearches: recentSearches || [],
  })
}
