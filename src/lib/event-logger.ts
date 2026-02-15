import { supabaseAdmin } from '@/lib/supabase/admin'

interface LogEventParams {
  sessionId: string
  userId?: string | null
  page: string
  action: string
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget 이벤트 로깅
 * access_logs 테이블에 범용 이벤트를 기록합니다.
 * 절대 사용자 응답을 블로킹하지 않습니다.
 */
export function logEvent({ sessionId, userId, page, action, metadata }: LogEventParams): void {
  Promise.resolve(
    supabaseAdmin
      .from('access_logs')
      .insert({
        session_id: sessionId,
        user_id: userId ?? null,
        page,
        action,
        metadata: metadata ?? null,
      })
  ).catch((error) => {
    console.error('Failed to log event:', error)
  })
}
