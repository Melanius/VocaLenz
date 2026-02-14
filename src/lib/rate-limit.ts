import { supabaseAdmin } from './supabase/admin'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: Date
}

// 일일 검색 제한
const LIMITS = {
  anonymous: 30, // 비로그인 사용자
  authenticated: 100, // 로그인 사용자
}

export async function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean
): Promise<RateLimitResult> {
  const limit = isAuthenticated ? LIMITS.authenticated : LIMITS.anonymous

  // 오늘 날짜의 시작/끝 시간 (UTC 기준)
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  const todayEnd = new Date(now)
  todayEnd.setUTCHours(23, 59, 59, 999)

  // search_logs에서 오늘 검색 횟수 카운트
  const { count, error } = await supabaseAdmin
    .from('search_logs')
    .select('*', { count: 'exact', head: true })
    .eq(isAuthenticated ? 'user_id' : 'session_id', identifier)
    .gte('searched_at', todayStart.toISOString())
    .lte('searched_at', todayEnd.toISOString())

  if (error) {
    console.error('Rate limit check error:', error)
    // 에러 시 허용 (안전 우선)
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetAt: todayEnd,
    }
  }

  const currentCount = count || 0
  const remaining = Math.max(0, limit - currentCount)

  return {
    allowed: currentCount < limit,
    remaining,
    limit,
    resetAt: todayEnd,
  }
}

export async function getRateLimitInfo(
  identifier: string,
  isAuthenticated: boolean
): Promise<{ used: number; limit: number; resetAt: Date }> {
  const limit = isAuthenticated ? LIMITS.authenticated : LIMITS.anonymous

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  const todayEnd = new Date(now)
  todayEnd.setUTCHours(23, 59, 59, 999)

  const { count } = await supabaseAdmin
    .from('search_logs')
    .select('*', { count: 'exact', head: true })
    .eq(isAuthenticated ? 'user_id' : 'session_id', identifier)
    .gte('searched_at', todayStart.toISOString())
    .lte('searched_at', todayEnd.toISOString())

  return {
    used: count || 0,
    limit,
    resetAt: todayEnd,
  }
}
