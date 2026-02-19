-- v2.0: 표현(Expression) 관련 테이블 추가
-- Supabase SQL Editor에서 실행

-- ============================================
-- 1. expressions 테이블 (이미 있으면 스킵)
-- ============================================
CREATE TABLE IF NOT EXISTS public.expressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expression TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'TEPS',
  meanings TEXT[] DEFAULT '{}',
  description TEXT,
  teps_point TEXT,
  context TEXT,
  pronunciation_tip TEXT,
  listening_parts TEXT[] DEFAULT '{}',
  paraphrasing JSONB DEFAULT '[]'::jsonb,
  comparisons JSONB DEFAULT '[]'::jsonb,
  example_sentence TEXT,
  example_translation TEXT,
  difficulty_level INTEGER DEFAULT 2,
  search_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 중복 방지 제약조건 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expressions_expression_exam_type_key'
  ) THEN
    ALTER TABLE public.expressions ADD CONSTRAINT expressions_expression_exam_type_key UNIQUE (expression, exam_type);
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_expressions_expression ON public.expressions(expression);
CREATE INDEX IF NOT EXISTS idx_expressions_exam_type ON public.expressions(exam_type);
CREATE INDEX IF NOT EXISTS idx_expressions_search_count ON public.expressions(search_count DESC);

-- updated_at 트리거
DROP TRIGGER IF EXISTS expressions_updated_at ON public.expressions;
CREATE TRIGGER expressions_updated_at
  BEFORE UPDATE ON public.expressions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. user_expressions 테이블 (단어장 - 표현)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_expressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expression_id UUID NOT NULL REFERENCES public.expressions(id) ON DELETE CASCADE,
  is_memorized BOOLEAN DEFAULT FALSE,
  needs_review BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, expression_id)
);

CREATE INDEX IF NOT EXISTS idx_user_expressions_user ON public.user_expressions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_expressions_expression ON public.user_expressions(expression_id);

-- ============================================
-- 3. user_expression_history 테이블 (검색 이력)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_expression_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expression_id UUID NOT NULL REFERENCES public.expressions(id) ON DELETE CASCADE,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_expression_history_user ON public.user_expression_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_expression_history_expression ON public.user_expression_history(expression_id);
CREATE INDEX IF NOT EXISTS idx_user_expression_history_time ON public.user_expression_history(searched_at DESC);

-- ============================================
-- 4. RLS 정책
-- ============================================
ALTER TABLE public.expressions ENABLE ROW LEVEL SECURITY;

-- expressions: 누구나 읽기 가능, 삽입/수정은 service role만
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expressions' AND policyname = 'Expressions are publicly readable') THEN
    CREATE POLICY "Expressions are publicly readable" ON public.expressions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expressions' AND policyname = 'Only service role can insert expressions') THEN
    CREATE POLICY "Only service role can insert expressions" ON public.expressions FOR INSERT WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expressions' AND policyname = 'Only service role can update expressions') THEN
    CREATE POLICY "Only service role can update expressions" ON public.expressions FOR UPDATE USING (false);
  END IF;
END $$;

ALTER TABLE public.user_expressions ENABLE ROW LEVEL SECURITY;

-- user_expressions: 본인 데이터만 관리
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_expressions' AND policyname = 'Users can manage own expressions') THEN
    CREATE POLICY "Users can manage own expressions" ON public.user_expressions
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.user_expression_history ENABLE ROW LEVEL SECURITY;

-- user_expression_history: 본인 이력만 조회/삽입
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_expression_history' AND policyname = 'Users can view own expression history') THEN
    CREATE POLICY "Users can view own expression history" ON public.user_expression_history
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_expression_history' AND policyname = 'Users can insert own expression history') THEN
    CREATE POLICY "Users can insert own expression history" ON public.user_expression_history
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
