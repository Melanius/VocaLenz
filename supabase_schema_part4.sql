-- ============================================
-- 자동 updated_at 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER words_updated_at
  BEFORE UPDATE ON public.words
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 단어 검색 시 search_count 증가 함수
-- ============================================
CREATE OR REPLACE FUNCTION increment_search_count(word_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.words SET search_count = search_count + 1 WHERE id = word_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- failed_searches UPSERT 함수
-- ============================================
CREATE OR REPLACE FUNCTION upsert_failed_search(
  p_input_text TEXT,
  p_status TEXT,
  p_correction TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO public.failed_searches (input_text, status, correction)
  VALUES (LOWER(TRIM(p_input_text)), p_status, p_correction)
  ON CONFLICT (input_text, status) DO UPDATE SET
    count = failed_searches.count + 1,
    last_searched_at = NOW(),
    correction = COALESCE(EXCLUDED.correction, failed_searches.correction)
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Auth 사용자 생성 시 자동 프로필 생성 트리거
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- users: 본인 데이터만 읽기/수정
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- words: 누구나 읽기 가능 (공용 캐시), 쓰기는 Service Role만
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Words are publicly readable" ON public.words
  FOR SELECT USING (true);
CREATE POLICY "Only service role can insert words" ON public.words
  FOR INSERT WITH CHECK (false);
CREATE POLICY "Only service role can update words" ON public.words
  FOR UPDATE USING (false);
-- 참고: service_role 키는 RLS를 우회하므로 API Route에서 supabaseAdmin으로 INSERT/UPDATE 수행

-- user_word_history: 본인 이력만
ALTER TABLE public.user_word_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own history" ON public.user_word_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.user_word_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_vocabulary: 본인 단어장만
ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own vocabulary" ON public.user_vocabulary
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_scores: 본인 성적만
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own scores" ON public.user_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- search_logs: Service Role만 삽입 (API Route에서 supabaseAdmin 사용)
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only service role can insert search logs" ON public.search_logs
  FOR INSERT WITH CHECK (false);

-- access_logs: Service Role만 삽입
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only service role can insert access logs" ON public.access_logs
  FOR INSERT WITH CHECK (false);

-- failed_searches: Service Role 전용
ALTER TABLE public.failed_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only service role manages failed searches" ON public.failed_searches
  FOR ALL USING (false);

-- word_reports: Service Role만 삽입 (API Route에서 supabaseAdmin 사용)
ALTER TABLE public.word_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only service role can insert reports" ON public.word_reports
  FOR INSERT WITH CHECK (false);
CREATE POLICY "Users can view own reports" ON public.word_reports
  FOR SELECT USING (auth.uid() = user_id);
