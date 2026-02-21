-- ============================================================
-- Level Change Requests 테이블 마이그레이션
-- 실행: Supabase Dashboard > SQL Editor에서 아래 전체 실행
-- ============================================================

CREATE TABLE IF NOT EXISTS level_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id uuid REFERENCES words(id) ON DELETE CASCADE,
  expression_id uuid REFERENCES expressions(id) ON DELETE CASCADE,
  current_level integer NOT NULL CHECK (current_level BETWEEN 1 AND 4),
  requested_level integer NOT NULL CHECK (requested_level BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reason text,
  admin_id uuid REFERENCES auth.users(id),
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT target_check CHECK (
    (word_id IS NOT NULL AND expression_id IS NULL) OR
    (word_id IS NULL AND expression_id IS NOT NULL)
  )
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_level_requests_pending
  ON level_change_requests(user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_level_requests_notifications
  ON level_change_requests(user_id, notified) WHERE notified = false;
CREATE INDEX IF NOT EXISTS idx_level_requests_admin
  ON level_change_requests(status, created_at DESC);

-- RLS
ALTER TABLE level_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own level requests"
  ON level_change_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own level requests"
  ON level_change_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
