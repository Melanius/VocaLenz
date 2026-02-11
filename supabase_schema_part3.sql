-- ============================================
-- 8. failed_searches (실패/비정상 검색 기록)
-- ============================================
CREATE TABLE public.failed_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  input_text TEXT NOT NULL,                     -- 사용자 입력 원문 (소문자 정규화)
  status TEXT NOT NULL,                         -- TYPO, INVALID, LOW_VALUE, KOREAN_NO_MATCH
  correction TEXT,                              -- TYPO일 때 AI 추천 수정 단어
  count INTEGER DEFAULT 1,                      -- 동일 입력 누적 횟수
  reported BOOLEAN DEFAULT FALSE,               -- 리포트 클릭 여부
  reporter_ids UUID[] DEFAULT '{}',             -- 리포트한 사용자 ID들
  first_searched_at TIMESTAMPTZ DEFAULT NOW(),
  last_searched_at TIMESTAMPTZ DEFAULT NOW(),

  -- 동일 입력 + 상태 조합 중복 방지 (UPSERT용)
  UNIQUE(input_text, status)
);

CREATE INDEX idx_failed_searches_input ON public.failed_searches(input_text);
CREATE INDEX idx_failed_searches_status ON public.failed_searches(status);
CREATE INDEX idx_failed_searches_count ON public.failed_searches(count DESC);
CREATE INDEX idx_failed_searches_reported ON public.failed_searches(reported) WHERE reported = TRUE;

-- ============================================
-- 9. word_reports (사용자 리포트 - 개발자 검토)
-- ============================================
CREATE TABLE public.word_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  input_text TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,
  message TEXT,                                 -- 사용자 추가 메시지 (선택)
  status TEXT DEFAULT 'pending',                -- pending, resolved, rejected
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_word_reports_status ON public.word_reports(status);
CREATE INDEX idx_word_reports_time ON public.word_reports(created_at DESC);
