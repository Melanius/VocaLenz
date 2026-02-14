import { createClient } from '@supabase/supabase-js'

// Service Role 클라이언트 - RLS를 우회하여 모든 작업 가능 (서버 전용)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
