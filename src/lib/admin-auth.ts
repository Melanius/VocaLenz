import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * 관리자 인증 확인
 * 로그인 + admin role 확인 후 user id 반환
 */
export async function requireAdmin(): Promise<{ userId: string } | { error: string; status: number }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.', status: 401 }
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: '관리자 권한이 필요합니다.', status: 403 }
  }

  return { userId: user.id }
}
