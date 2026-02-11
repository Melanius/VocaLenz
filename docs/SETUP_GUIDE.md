# VocaLenz - 개발 전 셋팅 가이드

> ⚠️ **이 문서의 모든 단계를 완료한 후 PROJECT_PLAN.md의 개발을 시작하세요.**
> 각 단계에서 획득한 키/URL을 `.env.local` 파일에 기록하며 진행합니다.

---

## 📋 최종 체크리스트 (한눈에 보기)

| # | 항목 | 완료 |
|---|------|------|
| 1 | Node.js 18+ & pnpm 설치 | ☐ |
| 2 | GitHub 저장소 생성 | ☐ |
| 3 | Supabase 프로젝트 생성 | ☐ |
| 4 | Supabase DB 스키마 실행 | ☐ |
| 5 | Supabase Auth 설정 (이메일 + Google) | ☐ |
| 6 | Supabase RLS 정책 적용 | ☐ |
| 7 | OpenAI API 키 발급 | ☐ |
| 8 | Vercel 프로젝트 연결 | ☐ |
| 9 | 환경변수 설정 (.env.local + Vercel) | ☐ |
| 10 | 도메인 등록 (선택) | ☐ |

> 💡 **발음 기능(Web Speech API):** 브라우저 내장 TTS를 사용하므로 별도 API 키나 셋팅이 불필요합니다. 비용 $0.

---

## 1. 개발 환경 준비

### 1.1 필수 소프트웨어

```bash
# Node.js 18 이상 확인
node -v   # v18.x.x 이상

# pnpm 설치 (npm보다 빠르고 디스크 효율적)
npm install -g pnpm

# Git 확인
git --version
```

### 1.2 추천 VS Code 확장

- **ESLint** - 코드 품질
- **Prettier** - 코드 포맷팅
- **Tailwind CSS IntelliSense** - 자동완성
- **Prisma** (선택) - 스키마 하이라이팅
- **Error Lens** - 인라인 에러 표시

---

## 2. GitHub 저장소 생성

### 2.1 저장소 생성

1. https://github.com/new 접속
2. 설정:
   - Repository name: `vocalenz`
   - Visibility: **Private** (PoC 단계이므로)
   - ✅ Add a README file
   - .gitignore template: **Node**
   - License: MIT (또는 None)
3. **Create repository** 클릭

### 2.2 로컬 클론

```bash
git clone https://github.com/YOUR_USERNAME/vocalenz.git
cd vocalenz
```

> 📝 `YOUR_USERNAME`을 본인의 GitHub 사용자명으로 교체하세요.

---

## 3. Supabase 프로젝트 생성

### 3.1 프로젝트 생성

1. https://supabase.com 접속 → **Start your project**
2. GitHub 계정으로 로그인
3. **New Project** 클릭
4. 설정:
   - Organization: (기본 또는 새로 생성)
   - Project name: `vocalenz`
   - Database Password: **강력한 비밀번호 설정 후 반드시 메모** ⚠️
   - Region: **Northeast Asia (Tokyo)** - 한국 사용자 대상이므로 가장 가까운 리전
   - Plan: **Free**
5. **Create new project** 클릭 (2~3분 소요)

### 3.2 키 확보 (반드시 메모)

프로젝트 생성 완료 후:

1. 좌측 메뉴 → **Project Settings** (⚙️ 톱니바퀴)
2. **API** 탭 클릭
3. 아래 값들을 메모:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

> ⚠️ **SERVICE_ROLE_KEY는 절대 클라이언트 코드에 노출하지 마세요.** 서버 사이드(API Routes)에서만 사용합니다.

---

## 4. Supabase DB 스키마 실행

### 4.1 SQL Editor에서 실행

1. Supabase Dashboard → 좌측 메뉴 → **SQL Editor**
2. **New query** 클릭
3. 아래 SQL을 **순서대로** 붙여넣고 실행 (▶ Run)

#### Part 1: 확장 기능 활성화 + 기본 테이블

```sql
-- ============================================
-- VocaLenz Database Schema v1.2
-- 실행 순서: Part 1 → Part 2 → Part 3 → Part 4
-- ============================================

-- UUID 생성 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. users (프로필 테이블 - Supabase Auth 연동)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  target_exam TEXT DEFAULT 'TEPS',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. words (단어 캐시 - AI 생성 결과)
-- ============================================
CREATE TABLE public.words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'TEPS',
  part_of_speech TEXT,                          -- 명사, 동사, 형용사 등
  pronunciation TEXT,                           -- 발음기호
  image_text TEXT,                              -- 이미지 연상 텍스트
  description TEXT,                             -- 문장형 상세 뜻
  teps_point TEXT,                              -- TEPS 포인트
  synonyms JSONB DEFAULT '[]'::jsonb,           -- 유사어 배열
  antonyms JSONB DEFAULT '[]'::jsonb,           -- 반의어 배열
  comparisons JSONB DEFAULT '[]'::jsonb,        -- 비교어 배열
  paraphrasing JSONB DEFAULT '[]'::jsonb,       -- Paraphrasing 표현 배열
  example_sentence TEXT,                        -- TEPS 예문
  example_translation TEXT,                     -- 예문 해석
  difficulty_level INTEGER DEFAULT 3,           -- 난이도 1~5
  search_count INTEGER DEFAULT 0,              -- 검색 횟수 카운터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 동일 시험 내 단어 중복 방지
  UNIQUE(word, exam_type)
);

-- 단어 검색 성능 인덱스
CREATE INDEX idx_words_word ON public.words(word);
CREATE INDEX idx_words_exam_type ON public.words(exam_type);
CREATE INDEX idx_words_part_of_speech ON public.words(part_of_speech);
CREATE INDEX idx_words_search_count ON public.words(search_count DESC);

-- ============================================
-- 3. user_word_history (검색 이력)
-- ============================================
CREATE TABLE public.user_word_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_word_history_user ON public.user_word_history(user_id);
CREATE INDEX idx_user_word_history_word ON public.user_word_history(word_id);
CREATE INDEX idx_user_word_history_time ON public.user_word_history(searched_at DESC);

-- ============================================
-- 4. user_vocabulary (단어장 / 북마크)
-- ============================================
CREATE TABLE public.user_vocabulary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  is_memorized BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 동일 사용자가 같은 단어를 중복 저장 방지
  UNIQUE(user_id, word_id)
);

CREATE INDEX idx_user_vocabulary_user ON public.user_vocabulary(user_id);
```

#### Part 2: 성적 + 로그 테이블

```sql
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
```

#### Part 3: Gatekeeper 관련 테이블

```sql
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
```

#### Part 4: 함수 + 트리거 + RLS

```sql
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
```

### 4.2 실행 확인

SQL Editor에서 Part 1~4를 순서대로 실행한 뒤, 좌측 메뉴 → **Table Editor**에서 아래 9개 테이블이 보이는지 확인:

- ✅ users
- ✅ words
- ✅ user_word_history
- ✅ user_vocabulary
- ✅ user_scores
- ✅ search_logs
- ✅ access_logs
- ✅ failed_searches
- ✅ word_reports

---

## 5. Supabase Auth 설정

### 5.1 이메일 인증 설정

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Email** 확인 (기본 활성화됨)
3. 설정:
   - ✅ Enable Email provider
   - ✅ Confirm email (이메일 인증 활성화)
   - Minimum password length: **8**

### 5.2 Google 소셜 로그인 설정

#### Google Cloud Console 설정:

1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성: `vocalenz`
3. **APIs & Services** → **OAuth consent screen**
   - User Type: **External**
   - App name: `VocaLenz`
   - Support email: 본인 이메일
   - **Save and Continue**
4. **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Name: `VocaLenz Web`
   - Authorized redirect URIs 추가:
     ```
     https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     (YOUR_SUPABASE_PROJECT_REF = Supabase URL에서 `https://` 뒤의 문자열)
5. **Client ID**와 **Client Secret** 메모

#### Supabase에 연결:

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Google** 클릭 → Enable
3. Client ID / Client Secret 입력
4. **Save**

### 5.3 Auth URL 설정

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. 설정:
   - Site URL: `http://localhost:3000` (개발 중)
   - Redirect URLs 추가:
     ```
     http://localhost:3000/auth/callback
     http://localhost:3000
     ```

> 📝 배포 후에 `https://vocalenz.vercel.app` 등의 프로덕션 URL도 추가해야 합니다.

---

## 6. OpenAI API 키 발급

1. https://platform.openai.com 접속 → 로그인
2. **API Keys** → **Create new secret key**
   - Name: `vocalenz-poc`
   - Permissions: **All**
3. 키 복사하여 메모: `sk-...`

### 6.1 사용량 제한 설정 (중요!)

1. **Settings** → **Limits**
2. Monthly budget: **$20** (안전장치)
3. 알림 설정: $10 도달 시 이메일 알림

> ⚠️ PoC 단계에서 예상 외 과금을 방지하기 위해 반드시 설정하세요.

---

## 7. Vercel 연결

### 7.1 Vercel 프로젝트 생성

1. https://vercel.com 접속 → GitHub 계정으로 로그인
2. **Add New Project**
3. **Import Git Repository** → `vocalenz` 저장소 선택
4. 설정:
   - Framework Preset: **Next.js** (자동 감지됨)
   - Root Directory: `./` (기본)
5. **Environment Variables**는 아래 8번에서 설정하므로 일단 **Deploy** 클릭
   - 아직 코드가 없으므로 실패해도 OK. 연결만 되면 됩니다.

### 7.2 Vercel 자동 배포 확인

- GitHub에 push할 때마다 자동 배포됩니다.
- `main` 브랜치 → Production
- 다른 브랜치 → Preview

---

## 8. 환경변수 설정

### 8.1 로컬 개발용 `.env.local`

프로젝트 루트에 `.env.local` 파일을 생성합니다:

```env
# ==============================
# Supabase
# ==============================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...여기에_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...여기에_service_role_key

# ==============================
# OpenAI
# ==============================
OPENAI_API_KEY=sk-...여기에_api_key

# ==============================
# App Config
# ==============================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=VocaLenz
```

> ⚠️ `.env.local`은 `.gitignore`에 포함되어 GitHub에 올라가지 않습니다. 하지만 반드시 확인하세요.

### 8.2 Vercel 환경변수 설정

1. Vercel Dashboard → 프로젝트 → **Settings** → **Environment Variables**
2. 아래 변수들을 하나씩 추가 (모든 환경: Production, Preview, Development):

| Key | Value | 비고 |
|-----|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | 공개 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | ⚠️ 서버 전용 |
| `OPENAI_API_KEY` | `sk-...` | ⚠️ 서버 전용 |
| `NEXT_PUBLIC_APP_URL` | `https://vocalenz.vercel.app` | 배포 URL |

---

## 9. 도메인 등록 (선택, 나중에 해도 됨)

PoC 단계에서는 `vocalenz.vercel.app`으로 충분합니다.
커스텀 도메인이 필요하면:

1. Namecheap / GoDaddy / 가비아 등에서 도메인 검색
   - 추천: `vocalenz.com`, `vocalenz.app`, `vocalenz.co`
2. 도메인 구매 후 Vercel에서 연결:
   - Vercel Dashboard → **Settings** → **Domains** → 도메인 추가
   - DNS 설정 안내에 따라 CNAME/A 레코드 설정

---

## 10. 최종 확인

모든 셋팅이 끝나면 아래를 확인하세요:

```
✅ GitHub 저장소: https://github.com/YOUR_USERNAME/vocalenz
✅ Supabase 프로젝트: https://supabase.com/dashboard/project/xxxxxxxx
   - 9개 테이블 생성 완료
   - Auth (이메일 + Google) 활성화
   - RLS 정책 적용 완료
✅ OpenAI API 키: 발급 완료, 월 $20 제한 설정
✅ Vercel: GitHub 저장소 연결 완료, 환경변수 설정 완료
✅ .env.local: 4개 키 모두 입력 완료
```

**위 항목이 모두 확인되면 `PROJECT_PLAN.md`의 Phase 1부터 개발을 시작합니다.**
