# VocaLenz - Project Plan (개발 실행 계획서)

> **전제조건:** `SETUP_GUIDE.md`의 모든 셋팅이 완료된 상태여야 합니다.
> **개발 규칙:** 각 Phase의 각 Step 완료 시 반드시 테스트 → 커밋 → 다음 Step 진행

---

## 📊 개발 진행 상황

### ✅ Phase 1: 프로젝트 초기화 및 기본 구조 (완료)
**완료 일시:** 2026-02-12 09:10

#### Step 1.1: Next.js 프로젝트 생성 ✅
- Next.js 15.5.12 설치 완료
- TypeScript, Tailwind CSS, ESLint 설정 완료
- src/ 디렉토리 구조 생성
- 커밋: `2aeb700 - chore: initialize Next.js project with TypeScript and Tailwind`

#### Step 1.2: shadcn/ui 설치 및 설정 ✅
- shadcn/ui 초기화 (new-york 스타일)
- Button, Input, Card 컴포넌트 설치
- Tailwind design tokens 설정
- src/lib/utils.ts 생성
- 커밋: `f1de609 - feat: setup shadcn/ui with basic components`

#### Step 1.3: Supabase 클라이언트 설정 ✅
- @supabase/supabase-js, @supabase/ssr 설치
- src/lib/supabase/client.ts (브라우저용)
- src/lib/supabase/server.ts (서버용)
- src/lib/supabase/middleware.ts (미들웨어용)
- src/middleware.ts (루트 미들웨어)
- 커밋: `f5559db - feat: setup Supabase client and authentication`

#### Step 1.4: TypeScript 타입 정의 ✅
- src/types/database.ts (Database 타입)
- src/types/api.ts (API 응답 타입)
- src/types/index.ts (공통 타입)
- 9개 테이블에 대한 완전한 타입 정의
- 커밋: `ab52bfb - feat: add TypeScript type definitions`

#### Step 1.5: 글로벌 레이아웃 및 디자인 시스템 ✅
- src/components/layout/header.tsx (네비게이션)
- src/components/layout/footer.tsx
- src/components/providers/theme-provider.tsx (다크 모드)
- src/app/layout.tsx 업데이트 (통합 레이아웃)
- 홈페이지 리디자인 (Hero + Features 섹션)
- 커밋: `b6cf047 - feat: setup global layout and design system`

**Phase 1 총 커밋:** 4개
**설치된 주요 패키지:**
- next@15.5.12, react@19.2.4
- @supabase/supabase-js@2.95.3, @supabase/ssr@0.8.0
- tailwindcss@3.4.19
- shadcn/ui 컴포넌트 (button, input, card)

> ⚠️ **v1.7 타입 업데이트 필요:** Phase 2 시작 전에 `src/types/database.ts`의 `Word` 인터페이스에 `description_en` 필드를, `UserProfile`에 `display_preferences` 필드를 추가해야 합니다. 또한 `DisplayPreferences`, `WordCardField` 타입을 추가합니다. 상세 타입 정의는 Step 1.4 섹션을 참조하세요.

---

## 기술 스택 요약

| 영역 | 기술 |
|------|------|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (이메일 + Google OAuth) |
| AI | OpenAI GPT-4o-mini (Gatekeeper + 단어 생성) |
| 발음 | Web Speech API (브라우저 내장 TTS, 비용 $0) |
| 배포 | Vercel |

---

## Phase 1: 프로젝트 초기화 및 기본 구조

### Step 1.1: Next.js 프로젝트 생성

```bash
pnpm create next-app@latest vocalenz --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd vocalenz
```

선택 옵션:
- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ `src/` directory
- ✅ App Router
- ❌ Turbopack (안정성을 위해 비활성화)
- Import alias: `@/*`

**테스트:**
```bash
pnpm dev
# http://localhost:3000 접속 → Next.js 기본 페이지 확인
```

**커밋:** `git commit -m "chore: initialize Next.js project with TypeScript and Tailwind"`

---

### Step 1.2: shadcn/ui 설치 및 설정

```bash
pnpm dlx shadcn@latest init
```

설정:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **yes**

필수 컴포넌트 설치:
```bash
pnpm dlx shadcn@latest add button input card dialog sheet scroll-area badge separator skeleton tabs toast avatar dropdown-menu alert
```

**테스트:** 아무 페이지에서 `<Button>` 렌더링 확인

**커밋:** `git commit -m "chore: setup shadcn/ui with base components"`

---

### Step 1.3: Supabase 클라이언트 설정

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

아래 파일들을 생성:

**`src/lib/supabase/client.ts`** - 브라우저용 클라이언트
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`src/lib/supabase/server.ts`** - 서버 컴포넌트/API Route용
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키 설정 불가 (무시)
          }
        },
      },
    }
  )
}
```

**`src/lib/supabase/admin.ts`** - Service Role 클라이언트 (서버 전용)
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**`src/lib/supabase/middleware.ts`** - 미들웨어용
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}
```

**`src/middleware.ts`** - 루트 미들웨어
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**테스트:** `pnpm dev` 실행 → 콘솔에 에러 없는지 확인

**커밋:** `git commit -m "feat: setup Supabase client (browser, server, admin, middleware)"`

---

### Step 1.4: TypeScript 타입 정의

**`src/types/database.ts`**
```typescript
export interface Word {
  id: string
  word: string
  exam_type: string
  part_of_speech: string | null
  pronunciation: string | null
  image_text: string | null
  description: string | null
  description_en: string | null        // v1.7: 영어 설명 (영영 사전)
  teps_point: string | null
  synonyms: string[]
  antonyms: string[]
  comparisons: string[]
  paraphrasing: string[]
  example_sentence: string | null
  example_translation: string | null
  difficulty_level: number
  search_count: number
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  target_exam: string
  display_preferences: DisplayPreferences  // v1.7: 단어 카드 커스터마이징
  created_at: string
  updated_at: string
}

// v1.7: 단어 카드 표시 설정
export type WordCardField = 'description' | 'description_en' | 'image_text' | 'teps_point' | 'synonyms' | 'antonyms' | 'paraphrasing' | 'comparisons' | 'example'

export interface DisplayPreferences {
  visibleFields: WordCardField[]    // 사용자가 선택한 표시 필드
  fieldOrder: WordCardField[]       // 필드 표시 순서
  searchMode: 1 | 2 | 3 | 4        // 동시 검색 단어 수
}

export interface UserVocabulary {
  id: string
  user_id: string
  word_id: string
  is_memorized: boolean
  added_at: string
  word?: Word  // joined
}

export interface UserScore {
  id: string
  user_id: string
  round: string | null
  listening: number | null
  vocabulary: number | null
  grammar: number | null
  reading: number | null
  total: number | null
  exam_date: string | null
  created_at: string
}

export interface SearchLog {
  id: string
  session_id: string
  user_id: string | null
  word: string
  gatekeeper_status: GatekeeperStatus | null
  searched_at: string
}

export type GatekeeperStatus = 'VALID' | 'TYPO' | 'KOREAN' | 'INVALID' | 'LOW_VALUE'

export interface GatekeeperResponse {
  status: GatekeeperStatus
  correction?: string        // TYPO일 때 수정 추천 단어
  suggestions?: string[]     // KOREAN일 때 추천 단어 목록
  reason: string             // 판별 사유
}

export interface WordGenerationResponse {
  word: string
  part_of_speech: string
  pronunciation: string
  image_text: string
  description: string
  description_en: string
  teps_point: string
  synonyms: string[]
  antonyms: string[]
  comparisons: string[]
  paraphrasing: string[]
  example_sentence: string
  example_translation: string
  difficulty_level: number
}

export interface FailedSearch {
  id: string
  input_text: string
  status: string
  correction: string | null
  count: number
  reported: boolean
  first_searched_at: string
  last_searched_at: string
}

export interface WordReport {
  id: string
  input_text: string
  user_id: string | null
  session_id: string | null
  message: string | null
  status: 'pending' | 'resolved' | 'rejected'
  created_at: string
}

// 검색 결과 통합 타입 (UI에서 사용)
export type SearchResult =
  | { type: 'word'; data: Word }
  | { type: 'typo'; correction: string; original: string }
  | { type: 'korean'; suggestions: string[]; original: string }
  | { type: 'invalid'; original: string }
  | { type: 'low_value'; original: string }
  | { type: 'loading'; message: string }
  | { type: 'error'; message: string }
```

**커밋:** `git commit -m "feat: add TypeScript type definitions for all entities"`

---

### Step 1.5: 글로벌 레이아웃 및 디자인 시스템

**`src/app/layout.tsx`** 수정:
```typescript
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'VocaLenz - 시험 최적화 AI 단어 사전',
  description: 'TEPS, TOEIC 등 시험에 최적화된 AI 기반 맞춤 영어 단어 사전',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="font-pretendard antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

> **폰트:** Pretendard Variable 웹폰트를 `src/fonts/` 디렉토리에 다운로드하여 배치합니다.
> 다운로드: https://github.com/orioncactus/pretendard/releases

**`src/app/globals.css`**에 커스텀 CSS 변수 추가 (shadcn 기본 위에):
```css
@layer base {
  :root {
    /* VocaLenz 브랜드 색상 */
    --vl-primary: 222 47% 14%;     /* #1A1A2E */
    --vl-accent: 213 64% 57%;     /* #4A90D9 */
    --vl-bg: 210 20% 98%;         /* #F8F9FA */
  }
}
```

**테스트:** `pnpm dev` → 폰트 로딩 및 기본 레이아웃 확인

**커밋:** `git commit -m "feat: setup global layout with Pretendard font and design tokens"`

---

## Phase 2: 인증 시스템

### Step 2.1: Auth 콜백 라우트

**`src/app/auth/callback/route.ts`**
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
```

### Step 2.2: 로그인/회원가입 페이지

**`src/app/auth/login/page.tsx`** - 로그인 페이지 UI 구현:
- 이메일 + 비밀번호 폼
- Google 소셜 로그인 버튼
- 회원가입 링크

**`src/app/auth/signup/page.tsx`** - 회원가입 페이지 UI 구현:
- 이메일 + 비밀번호 + 이름 폼
- Google 소셜 로그인 버튼
- 로그인 링크

### Step 2.3: Auth 유틸리티 훅

**`src/hooks/use-auth.ts`** - 인증 상태 관리 커스텀 훅:
- `useUser()` - 현재 로그인 사용자 정보
- `useSession()` - 세션 상태
- `signOut()` - 로그아웃

### Step 2.4: 세션 Provider

**`src/components/providers/auth-provider.tsx`** - 앱 전체 인증 상태 Context

**테스트 체크리스트:**
- [ ] 이메일 회원가입 → 인증 이메일 수신 → 이메일 확인 → 로그인 성공
- [ ] Google 소셜 로그인 → 리다이렉트 → 로그인 성공
- [ ] 로그아웃 → 메인으로 이동
- [ ] Supabase Dashboard → Authentication → Users에서 사용자 확인
- [ ] `users` 테이블에 프로필 자동 생성 확인 (트리거)

**커밋:** `git commit -m "feat: implement auth system (email + Google OAuth)"`

---

## Phase 3: AI 핵심 로직 (Gatekeeper + 단어 생성)

> ⚠️ **개발 순서 참고:** UI(Phase 4)보다 API를 먼저 구현합니다. API 없이 UI를 만들면 mock 데이터가 필요하고, 이후 재연결 작업이 발생하여 이중 작업이 됩니다. API를 먼저 완성한 뒤 UI를 붙이는 것이 효율적입니다.

### Step 3.1: OpenAI 클라이언트 설정

```bash
pnpm add openai
```

**`src/lib/openai.ts`**
```typescript
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
```

### Step 3.2: AI Gatekeeper 구현

**`src/lib/gatekeeper.ts`**

시스템 프롬프트:
```
당신은 영어 학습 앱의 입력 판별 시스템입니다.
사용자가 입력한 텍스트를 분석하여 아래 JSON 형식으로만 응답하세요.

판별 기준:
- VALID: 영어 단어 또는 숙어(phrasal verb, idiom)로 인정되며, TEPS 시험 학습에 가치가 있는 경우
- TYPO: 영어 단어 같지만 철자가 틀린 경우 (correction에 올바른 단어 제시)
- KOREAN: 한국어 입력인 경우 (suggestions에 TEPS 빈출 영단어 1~3개 추천)
- INVALID: 단어/숙어로 볼 수 없는 입력 (문장, 무의미한 문자열, 숫자 등)
- LOW_VALUE: 고유명사(Samsung, Tom), 관사(the, a), 대명사(I, you), 전치사(in, on) 등 TEPS 어휘 학습 가치가 낮은 단어

응답 형식 (JSON만):
{
  "status": "VALID" | "TYPO" | "KOREAN" | "INVALID" | "LOW_VALUE",
  "correction": "수정 추천 단어 (TYPO일 때만)",
  "suggestions": ["추천 단어1", "추천 단어2"] (KOREAN일 때만),
  "reason": "판별 사유 (한국어로)"
}
```

**`src/app/api/gatekeeper/route.ts`** - API 라우트
> ⚠️ 반드시 `response_format: { type: 'json_object' }`를 설정하여 JSON 모드를 강제합니다. 파싱 실패 시 최대 2회 재시도합니다.

### Step 3.3: 단어 생성 프롬프트 구현

**`src/lib/word-generator.ts`**

시스템 프롬프트:
```
당신은 TEPS 시험 전문 영어 어휘 교사입니다.
주어진 영어 단어/숙어에 대해 TEPS 시험 학습에 최적화된 정보를 아래 JSON 형식으로만 제공하세요.

중요 규칙:
1. 다의어의 경우 TEPS에서 가장 빈출되는 의미 1~2개 위주로 설명
2. 초등/중학 수준의 기본 뜻은 제외하고 시험에 출제되는 고급 의미 우선
3. 이미지 연상 텍스트는 그림이 아닌, 머릿속에 장면이 떠오르는 묘사문으로 작성
4. 예문은 TEPS 시험 스타일로 작성
5. 각 텍스트 필드는 최대 500자 이내로 작성할 것
6. paraphrasing은 해당 시험에서 실제 출제 시 바꿔 쓰기(paraphrasing)로 자주 등장하는 표현을 제시할 것 (단순 유사어가 아닌, 시험 문맥에서 치환 가능한 표현)
7. description은 한국어로, description_en은 영어로 각각 상세 뜻을 설명할 것 (영한 사전 + 영영 사전 동시 제공)

응답 형식 (JSON만):
{
  "word": "단어",
  "part_of_speech": "품사 (명사/동사/형용사/부사/숙어)",
  "pronunciation": "발음기호",
  "image_text": "이미지 연상 텍스트 (한국어, 2~3문장)",
  "description": "문장형 상세 뜻 (한국어, TEPS 관점)",
  "description_en": "Detailed definition in English (TEPS-oriented, academic register)",
  "teps_point": "TEPS 포인트 (한국어, 출제 경향/주의점)",
  "synonyms": ["유사어1", "유사어2", "유사어3"],
  "antonyms": ["반의어1", "반의어2"],
  "comparisons": ["비교어1 - 차이점 설명"],
  "paraphrasing": ["paraphrasing 표현1", "paraphrasing 표현2"],
  "example_sentence": "TEPS 스타일 영어 예문",
  "example_translation": "예문 한국어 해석",
  "difficulty_level": 3  (1~5, TEPS 기준 난이도)
}
```

### Step 3.4: 통합 검색 API

**`src/app/api/words/search/route.ts`**

#### 입력 정규화 (모든 처리의 시작점)
```typescript
function normalizeInput(raw: string): string {
  // 입력 길이 제한 (100자 초과 시 잘라냄)
  const trimmed = raw.trim().slice(0, 100)
  return trimmed
    .toLowerCase()             // 전체 소문자 변환 (Amity → amity, TAKE → take)
    .replace(/\s+/g, ' ')     // 연속 공백 → 단일 공백 (숙어: "take  after" → "take after")
}
```
> ⚠️ **입력 길이 제한:** UI(검색창 maxLength=100)와 API Route 양쪽에서 모두 100자 제한을 적용합니다. 긴 문자열이 Gatekeeper로 전달되면 불필요한 토큰 낭비가 발생합니다.
> ⚠️ **대소문자 정책:** DB에는 모든 단어를 소문자로 저장합니다. 사용자가 `Amity`, `AMITY`, `amity` 어떤 형태로 검색해도 동일한 캐시 결과를 반환합니다. 정규화된 값으로 DB 조회, DB 저장, Gatekeeper 호출을 모두 수행합니다.

#### 로직 플로우
1. 입력 정규화 (`normalizeInput()`)
2. DB 조회 (words 테이블, 정규화된 값으로)
3. DB에 존재 → 즉시 반환 + search_count 증가
4. DB에 미존재 → Gatekeeper 호출
5. VALID → 단어 생성 → DB 저장 → 반환
6. 그 외 → 해당 상태 결과 반환 + failed_searches 기록
7. search_logs에 전체 로그 기록

#### 동시성 처리 (Race Condition 방어)
여러 사용자가 동시에 같은 신규 단어를 검색할 경우를 대비:
```typescript
// DB 저장 시 UNIQUE 충돌 방어
const { error } = await supabaseAdmin
  .from('words')
  .upsert(wordData, { onConflict: 'word,exam_type', ignoreDuplicates: true })

// 이미 다른 요청이 삽입했을 수 있으므로 다시 조회
if (error) {
  const { data } = await supabaseAdmin
    .from('words')
    .select('*')
    .eq('word', normalized)
    .eq('exam_type', 'TEPS')
    .single()
  return data
}
```

#### OpenAI 응답 파싱 방어
```typescript
// JSON 모드 강제 + 실패 시 API 재호출 (최대 3회)
let parsed
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },  // JSON 모드 강제
      messages: [...],
    })
    parsed = JSON.parse(response.choices[0].message.content!)
    break  // 성공 시 루프 탈출
  } catch (e) {
    if (attempt === 2) throw new Error('AI 응답 3회 연속 실패')
    // 다음 시도 전 짧은 대기
    await new Promise(r => setTimeout(r, 500))
  }
}
```
> ⚠️ **재시도 = API 재호출:** 파싱 실패 시 같은 응답을 다시 파싱하는 것이 아니라, OpenAI API를 새로 호출해야 합니다. 같은 문자열은 몇 번을 파싱해도 같은 결과입니다.

### Step 3.5: Rate Limiting 구현

**`src/lib/rate-limit.ts`**
- 비로그인: 30회/일 (session_id 기반)
- 로그인: 100회/일 (user_id 기반)
- Supabase search_logs 카운트로 구현 (별도 Redis 불필요)

**테스트 체크리스트:**
- [ ] 유효 단어 검색 (예: "amity") → 단어 카드 생성 확인
- [ ] 동일 단어 재검색 → DB에서 즉시 반환 (API 미호출) 확인
- [ ] 오타 입력 (예: "techer") → 수정 추천 UI 확인
- [ ] 한국어 입력 (예: "배신하다") → 영단어 추천 확인
- [ ] 문장 입력 (예: "I want to go") → INVALID 안내 확인
- [ ] 고유명사 (예: "Samsung") → LOW_VALUE 안내 확인
- [ ] 숙어 입력 (예: "take after") → 정상 생성 확인
- [ ] DB에 데이터 저장 확인 (words, search_logs, failed_searches)
- [ ] Rate limit 초과 시 안내 메시지 확인

**커밋:** `git commit -m "feat: implement AI Gatekeeper + word generation + search API"`

---

## Phase 4: 메인 검색 UI (채팅형 인터페이스)

### Step 4.1: 레이아웃 구조

메인 페이지 레이아웃:
```
┌──────────────────────────────────────────┐
│  Header (로고 + 로그인/프로필)             │
├──────┬───────────────────────────────────┤
│      │                                   │
│ Side │     채팅형 검색 결과 영역            │
│ bar  │     (스크롤 가능)                   │
│      │                                   │
│(세션) │                                   │
│      ├───────────────────────────────────┤
│      │  검색 입력창 (하단 고정)             │
└──────┴───────────────────────────────────┘
```

구현 파일:
- **`src/app/(main)/page.tsx`** - 메인 페이지
- **`src/app/(main)/layout.tsx`** - 사이드바 포함 레이아웃
- **`src/components/search/search-input.tsx`** - 검색 입력 컴포넌트
- **`src/components/search/multi-search-input.tsx`** - 다중 검색 입력 (v1.7)
- **`src/components/search/search-mode-selector.tsx`** - 검색 모드 선택 1~4 (v1.7)
- **`src/components/search/search-results.tsx`** - 결과 목록 컴포넌트
- **`src/components/search/word-card.tsx`** - 단어 카드 컴포넌트
- **`src/components/search/card-customizer.tsx`** - 카드 필드 커스터마이징 (v1.7)
- **`src/hooks/use-display-preferences.ts`** - 표시 설정 훅 (v1.7)
- **`src/components/layout/header.tsx`** - 상단 헤더
- **`src/components/layout/sidebar.tsx`** - 사이드바 (세션 관리)

### Step 4.2: 검색 입력 컴포넌트

- 화면 중앙 배치 (첫 방문 시 GPT 새 채팅 스타일)
- 검색 후 하단 고정으로 전환
- Enter 키 또는 검색 버튼으로 검색
- 검색 중 로딩 상태 표시
- 검색창 maxLength=100 (입력 길이 제한)

#### v1.7: 동시 다중 검색 (최대 4개)
- 검색창 옆에 검색 모드 선택 버튼: [1] [2] [3] [4]
- 기본값: 1개 (단일 검색)
- 2~4개 선택 시 검색 입력창이 해당 개수만큼 표시
- 모든 입력창에 단어 입력 후 한번에 검색 → 결과가 나란히 표시
- TEPS 4지선다 보기를 한번에 비교하는 용도
- 로그인 사용자: 선택한 검색 모드가 `display_preferences.searchMode`에 저장되어 유지
- 비로그인 사용자: localStorage에 저장

구현 파일:
- **`src/components/search/search-mode-selector.tsx`** - 검색 모드 선택 (1~4)
- **`src/components/search/multi-search-input.tsx`** - 다중 검색 입력 컴포넌트

### Step 4.3: 단어 카드 컴포넌트

검색 결과 단어 카드 구성 (기본 전체 표시, 사용자 커스터마이징 가능):
1. 단어 + 발음기호 + 품사 + 🔊 발음 버튼 (상단, 항상 표시)
2. 이미지 연상 텍스트 (🎨 아이콘) — `image_text`
3. 상세 뜻 - 한국어 (📖 아이콘) — `description`
4. 상세 뜻 - 영어 (📖🔤 아이콘) — `description_en` (영영 사전)
5. TEPS 포인트 (🎯 하이라이트 박스) — `teps_point`
6. 유사어/반의어 (태그 뱃지) — `synonyms` / `antonyms`
7. Paraphrasing (🔄 시험 빈출 바꿔쓰기 표현, 태그 뱃지) — `paraphrasing`
8. 비교어 (태그 뱃지) — `comparisons`
9. TEPS 예문 (💡 하이라이트) — `example`
10. 단어장 추가 버튼 (로그인 사용자, 항상 표시)

> **항상 표시되는 영역:** 1번(단어+발음+품사+🔊)과 10번(단어장 버튼)은 커스터마이징 대상이 아니며 항상 표시됩니다.

#### v1.7: 단어 카드 필드 커스터마이징

**`src/components/search/card-customizer.tsx`** - 단어 카드 설정 패널:
- 검색 영역 상단에 ⚙️ 설정 아이콘 → 클릭 시 드롭다운/사이드 패널 열림
- 각 필드별 체크박스 (ON/OFF 토글)
- 드래그 앤 드롭으로 필드 표시 순서 변경
- 설정은 실시간 반영 (설정 변경 → 즉시 카드 업데이트)
- 로그인 사용자: DB `users.display_preferences`에 저장 (API 호출)
- 비로그인 사용자: localStorage에 저장

커스터마이징 가능 필드:
```typescript
const CUSTOMIZABLE_FIELDS: { key: WordCardField; label: string; icon: string }[] = [
  { key: 'description', label: '뜻 (한국어)', icon: '📖' },
  { key: 'description_en', label: '뜻 (영어)', icon: '🔤' },
  { key: 'image_text', label: '이미지 연상', icon: '🎨' },
  { key: 'teps_point', label: 'TEPS 포인트', icon: '🎯' },
  { key: 'synonyms', label: '유사어/반의어', icon: '🔗' },
  { key: 'antonyms', label: '반의어', icon: '↔️' },
  { key: 'paraphrasing', label: 'Paraphrasing', icon: '🔄' },
  { key: 'comparisons', label: '비교어', icon: '⚖️' },
  { key: 'example', label: 'TEPS 예문', icon: '💡' },
]
```

**설정 저장 API:**
- **`src/app/api/users/preferences/route.ts`** - PUT: display_preferences 업데이트

구현 파일:
- **`src/components/search/card-customizer.tsx`** - 설정 패널 UI
- **`src/hooks/use-display-preferences.ts`** - 표시 설정 커스텀 훅 (로그인 시 DB / 비로그인 시 localStorage)
- **`src/components/search/word-card.tsx`** - 커스터마이징 적용된 카드 렌더링

### Step 4.4: 발음 재생 기능 (Web Speech API)

**`src/hooks/use-pronunciation.ts`** - 발음 재생 커스텀 훅:
```typescript
'use client'
import { useCallback, useState } from 'react'

export function usePronunciation() {
  const [isSpeaking, setIsSpeaking] = useState(false)

  const speak = useCallback((word: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    // 이전 발음 중단
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.9  // 약간 느리게 (학습용)
    utterance.pitch = 1

    // 영어 음성 우선 선택
    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'))
      || voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en'))
    if (englishVoice) utterance.voice = englishVoice

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  return { speak, isSpeaking }
}
```

단어 카드에서 사용:
```tsx
const { speak, isSpeaking } = usePronunciation()

<button onClick={() => speak(word.word)} disabled={isSpeaking}>
  🔊 {isSpeaking ? '재생 중...' : '발음 듣기'}
</button>
```

> **참고:** Web Speech API는 비용 $0이며, 모든 주요 브라우저(Chrome, Safari, Edge, Firefox)에서 지원됩니다. 별도 API 키나 서버 호출이 불필요합니다.

### Step 4.5: 상태별 버블 UI

Gatekeeper 결과에 따른 UI:
- **VALID (단어 카드)**: 파란색 테두리 카드
- **TYPO**: 노란색 경고 버블 + [맞아요] / [다시 입력] 버튼
- **KOREAN**: 보라색 추천 버블 + 추천 단어 클릭 카드
- **INVALID**: 회색 안내 버블 + 리포팅 버튼
- **LOW_VALUE**: 회색 안내 버블
- **Loading**: 스켈레톤 + 랜덤 대기 메시지

### Step 4.6: 오늘의 추천 단어

- 메인 검색창 하단에 카드 3~4개 배치
- 당일 search_logs에서 가장 많이 검색된 단어 집계
- 클릭 시 해당 단어 검색 실행

**테스트 체크리스트:**
- [ ] 검색창에 타이핑 → 입력 반응 확인
- [ ] 검색창 100자 초과 입력 불가 확인
- [ ] 여러 번 검색 → 채팅 형태로 누적 표시
- [ ] 스크롤 → 이전 결과 확인 가능
- [ ] 모바일 반응형 레이아웃 정상 동작
- [ ] 단어 카드의 모든 영역이 올바르게 렌더링
- [ ] 🔊 발음 버튼 클릭 → 영어 발음 재생 확인
- [ ] 발음 재생 중 버튼 비활성화 → 재생 완료 후 복원
- [ ] 비로그인 상태에서 검색 → 채팅 히스토리 표시 확인
- [ ] 비로그인 상태에서 페이지 새로고침 → 채팅 히스토리 초기화 확인
- [ ] ⚙️ 설정에서 필드 체크박스 OFF → 해당 필드 카드에서 숨김 확인
- [ ] 필드 순서 드래그 변경 → 카드에 즉시 반영 확인
- [ ] 로그인 사용자: 설정 변경 → 새로고침 후에도 유지 확인
- [ ] 비로그인 사용자: 설정이 localStorage에 저장되는지 확인
- [ ] 검색 모드 [2] 선택 → 입력창 2개 표시 확인
- [ ] 검색 모드 [4] 선택 → 4개 단어 동시 검색 → 결과 나란히 표시 확인
- [ ] 영어 설명(description_en) 필드 ON 시 영영 사전 뜻 표시 확인

> **비로그인 사용자 검색 이력 정책:**
> - 채팅 UI 히스토리: React state(클라이언트 메모리)로만 유지. 페이지 새로고침 시 초기화됨
> - DB 기록: `search_logs` 테이블에 session_id로 기록됨 (분석용, 사용자에게 표시 안 함)
> - `user_word_history`: `user_id NOT NULL`이므로 비로그인 사용자의 이력은 저장 불가 (설계 의도)
> - 로그인 유도: 검색 3회 이상 시 "로그인하면 검색 이력이 저장됩니다" 안내 배너 표시

**커밋:** `git commit -m "feat: implement chat-style search UI with word cards"`

---

## Phase 5: 사용자 기능 (단어장, 성적, 이력)

### Step 5.1: 단어장 기능

**`src/app/(main)/vocabulary/page.tsx`**

기능:
- 단어장 목록 보기 (카드 그리드)
- 단어 추가 (검색 결과에서 ⭐ 클릭)
- 단어 삭제
- 암기 완료 토글
- 무료 100개 제한 표시 (n/100)
- 100개 초과 시 유료 구독 안내 UI

API:
- **`src/app/api/vocabulary/route.ts`** - CRUD

### Step 5.2: 검색 이력 페이지

**`src/app/(main)/history/page.tsx`**

기능:
- 검색 이력 목록 (날짜별 그룹)
- 이력에서 클릭 시 해당 단어 상세 보기
- 로그인 필수 (비로그인 시 로그인 유도)

### Step 5.3: 성적 관리 페이지

**`src/app/(main)/scores/page.tsx`**

기능:
- 시험 성적 입력 폼: 회차 / 청해 / 어휘 / 문법 / 독해 / 총점 / 시험일
- 성적 목록 (테이블)
- 성적 추이 차트 (간단한 라인 차트 - recharts)
- 성적 수정/삭제

API:
- **`src/app/api/scores/route.ts`** - CRUD

**테스트 체크리스트:**
- [ ] 단어 검색 후 단어장에 추가 → 단어장 페이지에서 확인
- [ ] 단어장 100개 제한 도달 시 안내 메시지
- [ ] 암기 완료 토글 → DB 반영 확인
- [ ] 성적 입력 → 목록에 표시
- [ ] 성적 수정/삭제 동작 확인
- [ ] 검색 이력 → 날짜별 그룹 표시

**커밋:** `git commit -m "feat: implement vocabulary, history, and score management"`

---

## Phase 6: 퀴즈 시스템

### Step 6.1: 퀴즈 로직

**`src/lib/quiz.ts`**

퀴즈 생성 로직:
1. 사용자 단어장에서 랜덤 단어 선택 (정답)
2. 정답의 품사(part_of_speech) 확인
3. words 테이블에서 같은 품사의 다른 단어 3개를 랜덤 선택 (오답 보기)
4. 정답 포함 4개를 셔플하여 4지선다 생성

**오답 보기 Fallback 로직 (DB 단어 부족 시):**
```
1순위: 같은 품사 단어 3개 (이상적)
2순위: 같은 품사가 부족하면 → 다른 품사 단어로 나머지 채움
3순위: DB 전체 단어가 4개 미만이면 → 퀴즈 불가 안내
```
> ⚠️ PoC 초기에는 DB에 단어가 적어 같은 품사 보기를 채울 수 없는 경우가 빈번합니다. 반드시 fallback을 구현해야 퀴즈가 정상 작동합니다.

퀴즈 유형 (Phase 1):
- **영어 → 한국어**: 단어 보여주고 뜻 고르기
- **한국어 → 영어**: 뜻 보여주고 단어 고르기

### Step 6.2: 퀴즈 UI

**`src/app/(main)/quiz/page.tsx`**

기능:
- 퀴즈 시작 (단어장에서 10문제 세트)
- 4지선다 UI (같은 품사 보기)
- 정답/오답 피드백 (정답 시 초록, 오답 시 빨강 + 정답 표시)
- 결과 요약 (정답률, 틀린 단어 목록)
- 유료 구독 필요 표시

**테스트 체크리스트:**
- [ ] 퀴즈 시작 → 4지선다 보기가 같은 품사인지 확인
- [ ] 같은 품사 부족 시 → 다른 품사로 보기 채워지는지 확인
- [ ] 정답 선택 → 초록색 피드백
- [ ] 오답 선택 → 빨간색 + 정답 표시
- [ ] 10문제 완료 → 결과 요약 표시
- [ ] 단어장에 단어가 4개 미만 → 퀴즈 불가 안내
- [ ] DB 전체 단어 4개 미만 → 퀴즈 불가 안내

**커밋:** `git commit -m "feat: implement quiz system with same POS answer choices"`

---

## Phase 7: 리포팅 시스템 + 데이터 수집

### Step 7.1: 리포팅 API

**`src/app/api/reports/route.ts`**

기능:
- INVALID 판별 시 리포팅 버튼 → word_reports 테이블에 저장
- failed_searches 테이블 reported 플래그 업데이트

### Step 7.2: 세션 관리 및 로깅

**`src/lib/session.ts`**
- UUID 기반 세션 ID 생성 (localStorage)
- 로그인 시 세션 데이터를 user_id와 연결

**`src/lib/analytics.ts`**
- 페이지 뷰 로깅 (access_logs)
- 검색 로깅 (search_logs)
- 이벤트 로깅 (클릭, 단어장 추가 등)

### Step 7.3: 접속 로그 미들웨어

access_logs에 자동 기록:
- 페이지 URL
- 접속 시간
- 세션 ID
- user_id (로그인 시)

**테스트 체크리스트:**
- [ ] INVALID 검색 → 리포팅 버튼 클릭 → word_reports에 저장 확인
- [ ] 페이지 이동 시 access_logs 기록 확인
- [ ] 검색 시 search_logs 기록 확인 (gatekeeper_status 포함)
- [ ] 비로그인 → 로그인 시 세션 데이터 연결 확인

**커밋:** `git commit -m "feat: implement reporting system and analytics logging"`

---

## Phase 8: 마무리 및 배포

### Step 8.1: SEO 최적화

- 동적 메타데이터 (각 단어 페이지별)
- `robots.txt`, `sitemap.xml`
- Open Graph 이미지

### Step 8.2: 에러 핸들링

- 전역 에러 바운더리 (`error.tsx`)
- API 에러 응답 표준화
- OpenAI 장애 시 fallback 메시지
- 네트워크 오류 시 재시도 UI

### Step 8.3: 성능 최적화

- 이미지 최적화 (next/image)
- API 라우트 응답 캐싱 (자주 검색되는 단어)
- 번들 사이즈 분석 (`@next/bundle-analyzer`)
- Lighthouse 점수 확인 (목표: 90+)

### Step 8.4: 최종 QA

**전체 플로우 테스트:**
- [ ] 첫 방문 → 메인 화면 → 검색 → 결과 확인
- [ ] 회원가입 → 이메일 인증 → 로그인
- [ ] Google 소셜 로그인
- [ ] 단어 검색 (VALID, TYPO, KOREAN, INVALID, LOW_VALUE 각각)
- [ ] 단어장 추가/삭제/암기 토글
- [ ] 퀴즈 진행 (정답/오답)
- [ ] 성적 입력/수정/삭제
- [ ] 검색 이력 확인
- [ ] 로그아웃 → 재로그인 → 데이터 유지
- [ ] 모바일 반응형 확인 (375px, 768px, 1440px)
- [ ] Supabase Dashboard에서 모든 테이블 데이터 확인

### Step 8.5: Vercel 프로덕션 배포

```bash
git push origin main
```

Vercel이 자동으로 빌드 및 배포합니다.

배포 후 확인:
1. Vercel Dashboard → 배포 로그 확인 (빌드 에러 없는지)
2. 프로덕션 URL 접속 → 전체 기능 확인
3. Supabase Auth → URL Configuration에 프로덕션 URL 추가
4. Google OAuth → Authorized redirect URIs에 프로덕션 URL 추가

**커밋:** `git commit -m "chore: production-ready with SEO, error handling, and optimization"`

---

## 개발 완료 후 운영 체크리스트

| 항목 | 내용 | 상태 |
|------|------|------|
| 모니터링 | Vercel Analytics 활성화 | ☐ |
| 에러 추적 | Sentry 연동 (선택) | ☐ |
| 백업 | Supabase 자동 백업 확인 | ☐ |
| API 비용 | OpenAI 사용량 모니터링 | ☐ |
| 사용자 피드백 | word_reports 주기적 확인 | ☐ |
| 콘텐츠 품질 | 생성된 단어 설명 검수 | ☐ |
| 성능 | Lighthouse 점수 90+ 유지 | ☐ |

---

## 부록: 주요 커맨드 모음

```bash
# 개발 서버
pnpm dev

# 빌드
pnpm build

# 린트
pnpm lint

# 타입 체크
pnpm tsc --noEmit

# Supabase 타입 생성 (스키마 변경 시)
pnpm dlx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```
