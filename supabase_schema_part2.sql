-- ============================================
-- 5. user_scores (시험 성적 기록)
-- ============================================
CREATE TABLE public.user_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  round TEXT,                                   -- 시험 회차
  listening INTEGER,                            -- 청해
  vocabulary INTEGER,                           -- 어휘
  grammar INTEGER,                              -- 문법
  reading INTEGER,                              -- 독해
  total INTEGER,                                -- 총점
  exam_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_scores_user ON public.user_scores(user_id);

-- ============================================
-- 6. search_logs (전체 검색 로그 - 비로그인 포함)
-- ============================================
CREATE TABLE public.search_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,                     -- 비로그인 세션 추적
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  word TEXT NOT NULL,
  gatekeeper_status TEXT,                       -- VALID, TYPO, KOREAN, INVALID, LOW_VALUE
  ip_address TEXT,
  user_agent TEXT,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_logs_session ON public.search_logs(session_id);
CREATE INDEX idx_search_logs_user ON public.search_logs(user_id);
CREATE INDEX idx_search_logs_word ON public.search_logs(word);
CREATE INDEX idx_search_logs_time ON public.search_logs(searched_at DESC);
CREATE INDEX idx_search_logs_status ON public.search_logs(gatekeeper_status);

-- ============================================
-- 7. access_logs (접속 로그)
-- ============================================
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  page TEXT NOT NULL,
  action TEXT,                                  -- view, click, scroll 등
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_logs_session ON public.access_logs(session_id);
CREATE INDEX idx_access_logs_time ON public.access_logs(created_at DESC);
