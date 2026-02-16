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

### ✅ Phase 2: 인증 시스템 (완료)
**완료 일시:** 2026-02-12

#### Step 2.1: Auth 콜백 라우트 ✅
- src/app/auth/callback/route.ts 구현
- 커밋: `ad2be04 - feat: implement authentication system (Phase 2)`

#### Step 2.2: 로그인/회원가입 페이지 ✅
- src/app/auth/login/page.tsx (이메일 + Google 소셜 로그인)
- src/app/auth/signup/page.tsx (회원가입)
- src/app/auth/error/page.tsx (인증 에러)

#### Step 2.3: Auth 유틸리티 훅 ✅
- src/hooks/use-auth.ts (useUser, useSession, signOut)

#### Step 2.4: 세션 Provider ✅
- src/components/providers/auth-provider.tsx (앱 전체 인증 상태 Context)

**Phase 2 총 커밋:** 2개 (기능 구현 + docs 업데이트)

### ✅ Phase 3: AI 핵심 로직 (완료)
**완료 일시:** 2026-02-13 09:05 (KST)

#### Step 3.1: OpenAI 클라이언트 설정 ✅
- openai 패키지 설치
- src/lib/openai.ts 생성

#### Step 3.2: AI Gatekeeper 구현 ✅
- src/lib/gatekeeper.ts (5개 상태 판별: VALID, TYPO, KOREAN, INVALID, LOW_VALUE)
- src/app/api/gatekeeper/route.ts (독립 API 엔드포인트)
- JSON 모드 강제 + 3회 재시도 로직
- 테스트 결과: VALID(amity), TYPO(techer→teacher), KOREAN(배신하다→betray/deceive/double-cross), INVALID(I want to go home), LOW_VALUE(Samsung) 모두 정상

#### Step 3.3: 단어 생성 프롬프트 구현 ✅
- src/lib/word-generator.ts (GPT-4o-mini, v1.7 description_en 포함)
- JSON 모드 강제 + 3회 재시도 + 필수 필드 검증

#### Step 3.4: 통합 검색 API ✅
- src/app/api/words/search/route.ts
- 전체 플로우 동작 확인: 입력 정규화 → DB 캐시 조회 → Gatekeeper → 단어 생성 → DB 저장 → 반환
- 동시성 처리 (UPSERT + 충돌 시 재조회)
- search_logs, failed_searches, user_word_history 기록
- DB 캐시 반환 시 search_count 증가
- 테스트 결과: "amity" 신규 생성 성공, 재검색 시 DB 캐시 반환 (1.5초), "take after" 숙어 생성 성공

#### Step 3.5: Rate Limiting 구현 ✅
- src/lib/rate-limit.ts (비로그인 30회/일, 로그인 100회/일)
- search_logs 카운트 기반 (별도 Redis 불필요)
- remaining 카운트 응답에 포함

**Phase 3 검증 결과:**
- TypeScript 타입 체크: ✅ 에러 없음
- ESLint: ✅ 에러 없음 (warning 1건 - useEffect dependency, 기능 무관)
- 프로덕션 빌드: ✅ 성공 (Next.js 15.5.12)
- Gatekeeper API: ✅ 5개 케이스 모두 정상
- 통합 검색 API: ✅ 신규 생성, 캐시 반환, 숙어 처리 모두 정상
- Rate Limit: ✅ remaining 카운트 정상 감소

### ✅ Phase 4: 메인 검색 UI (완료)
**완료 일시:** 2026-02-13 19:30 (KST)

#### Step 4.1: shadcn 컴포넌트 + @dnd-kit 설치 ✅
- shadcn/ui 17개 컴포넌트 설치 (scroll-area, separator, skeleton, badge, alert, avatar, label, checkbox, switch, tooltip, dialog, sheet, dropdown-menu, tabs, toast, toaster, use-toast)
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities 설치

#### Step 4.2: 커스텀 훅 생성 ✅
- src/hooks/use-pronunciation.ts (Web Speech API, en-US, rate 0.9)
- src/hooks/use-display-preferences.ts (로그인→DB, 비로그인→localStorage)

#### Step 4.3: SearchContext + 핵심 컴포넌트 ✅
- src/contexts/search-context.tsx (채팅 히스토리 배열, addToHistory/updateHistoryItem)
- src/components/search/search-input.tsx (단일 검색, maxLength=100, 로딩 상태)
- src/components/search/word-card.tsx (9개 필드, preferences 기반 표시/순서)
- src/components/search/search-results.tsx (6개 상태별 버블 UI: word/typo/korean/invalid/low_value/error)

#### Step 4.4: 레이아웃 전환 ✅
- src/app/(main)/layout.tsx (SearchProvider + 사이드바 + 메인 영역)
- src/app/(main)/page.tsx (빈 상태 ↔ 채팅 상태 전환)
- src/components/layout/sidebar.tsx (검색 기록, 데스크톱: 고정, 모바일: Sheet)
- src/app/page.tsx 삭제 → (main)/page.tsx로 대체
- src/components/layout/header.tsx: "단어 검색" 링크를 `/`로 변경
- src/app/layout.tsx: Toaster 추가

#### Step 4.5: 다중 검색 + 카드 커스터마이저 ✅
- src/components/search/search-mode-selector.tsx ([1][2][3][4] 모드 선택)
- src/components/search/multi-search-input.tsx (2~4개 병렬 검색)
- src/components/search/card-customizer.tsx (Sheet 패널, 체크박스 토글 + @dnd-kit 드래그 정렬)

#### Step 4.6: 오늘의 추천 단어 ✅
- src/app/api/words/recommended/route.ts (search_logs 기반 인기 단어 3~4개)
- src/components/search/recommended-words.tsx (추천 단어 카드 UI)

**Phase 4 검증 결과:**
- TypeScript 타입 체크: ✅ 에러 없음
- ESLint: ✅ 에러 없음 (warning 1건 - useEffect dependency, 기능 무관)
- 프로덕션 빌드: ✅ 성공 (Next.js 15.5.12, `/` 라우트 38.9 kB first load JS)

**Phase 4 생성 파일:** 14개
**Phase 4 수정 파일:** 3개 (layout.tsx, header.tsx, page.tsx 삭제)
**설치된 주요 패키지:**
- @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2
- shadcn/ui 추가 컴포넌트 17개

### ✅ Phase 4.5: 테스트 피드백 반영 개선 (완료)
**완료 일시:** 2026-02-14 21:00 (KST)

#### 4.5.1: `meanings` 필드 추가 (영한 사전 단답형 뜻) ✅
- DB: `words` 테이블에 `meanings text[] DEFAULT '{}'` 컬럼 추가
- `src/types/database.ts`: `Word`, `WordGenerationResponse`에 `meanings: string[]` 추가
- `WordCardField` 타입에 `'meanings'` 추가
- `src/lib/word-generator.ts`: GPT 프롬프트에 meanings 필드 추가 (최대 3개, 품사 포함, TEPS 빈출 순)
- `src/app/api/words/search/route.ts`: UPSERT 및 transformWord에 meanings 매핑 추가
- `src/components/search/word-card.tsx`: meanings 필드 렌더링 (번호 매김, 커스터마이저 대상)
- `src/components/search/card-customizer.tsx`: meanings 필드 토글 추가
- `src/db/migrations/001_add_meanings.sql`: DB 마이그레이션 파일 생성

#### 4.5.2: 한영 사전 DB 검색 전환 ✅
- 기존: GPT suggestions로 한국어→영어 추천 → **변경: DB `meanings` 배열에서 LIKE 검색**
- `search_by_meaning` RPC 함수 생성 (Supabase SQL)
- `SearchResult` korean 타입: `suggestions: string[]` → `suggestions: Word[]`로 변경
- 검색 결과가 없으면 "아직 등록된 단어가 없습니다" 메시지 반환
- `src/components/search/search-results.tsx`: 한영 결과를 WordCard 리스트로 표시

#### 4.5.3: 설정 저장 버그 수정 + 기본값/라벨 변경 ✅
- **설정 저장 버그**: localStorage를 단일 소스로 전환 (DB profile이 덮어쓰는 문제 해결)
  - `use-display-preferences.ts` 전면 재작성
  - localStorage 항상 우선, DB profile은 초기 시드로만 사용
  - `SYNC_EVENT` 커스텀 이벤트로 컴포넌트 간 실시간 동기화
  - `migratePreferences()` 함수로 이전 데이터 호환성 보장
- **기본값 변경**: 7개 필드 활성화 (image_text, meanings, description, teps_point, example, paraphrasing, comparisons)
- **라벨 변경**: '한국어 뜻' → '한국어 설명', '영어 정의' → '영어 설명'
- **카드 커스터마이저**: 로컬 state로 관리 + "설정 저장" 버튼 추가 + toast 피드백

#### 4.5.4: 검색 입력 통합 (MultiSearchInput) ✅
- `src/components/search/search-input.tsx` 삭제
- `src/components/search/multi-search-input.tsx`에서 모드 1~4 모두 처리
  - 모드 1: 기존과 동일한 라운드 검색창 UI
  - 모드 2~4: N개 입력창 + 검색 버튼 (모든 입력창 필수)
- `src/app/(main)/page.tsx`: SearchInput/SearchModeSelector 제거, MultiSearchInput만 사용

#### 4.5.5: 로딩 대기 TEPS 청해 학습 문장 ✅
- `src/lib/loading-phrases.ts` 생성: TEPS 청해 구어체 문장 100개 (영어+한국어)
- `src/components/search/search-results.tsx`: LoadingBubble 컴포넌트 추가
  - "기다리시면서 아래 문장을 외워보세요!" 안내
  - 영어 문장 + 한국어 해석 함께 표시
  - 10초마다 랜덤 문장 교체

#### 4.5.6: 난이도 체계 개편 (TEPS 목표 점수 기반 Lv.1-4) ✅
- 기존 generic 1-5 (항상 3) → **TEPS 목표 점수 기반 1-4 체계**
  - Lv.1 Essential (327점↓): 기초 학술어휘, 일상 빈출어
  - Lv.2 Core (450점 목표): 중급 학술/비즈니스 어휘
  - Lv.3 Advanced (550점+): 전문 분야, 까다로운 구동사
  - Lv.4 Killer (만점 도전): 매우 희귀하거나 문맥적 의미가 까다로운 어휘
- `src/lib/word-generator.ts`: GPT 프롬프트 난이도 기준 변경
- `src/components/search/word-card.tsx`: LevelBadge 컴포넌트 (색상별 구분)
  - Essential: 초록, Core: 파랑, Advanced: 주황, Killer: 빨강
- `src/app/api/words/reclassify/route.ts` 생성: 기존 단어 일괄 재분류 API (일회용)

**Phase 4.5 변경 파일:** 10개 수정, 3개 생성, 1개 삭제

| 구분 | 파일 |
|------|------|
| 수정 | `src/types/database.ts`, `src/lib/word-generator.ts`, `src/lib/gatekeeper.ts` |
| 수정 | `src/app/api/words/search/route.ts`, `src/hooks/use-display-preferences.ts` |
| 수정 | `src/components/search/word-card.tsx`, `src/components/search/card-customizer.tsx` |
| 수정 | `src/components/search/search-results.tsx`, `src/components/search/multi-search-input.tsx` |
| 수정 | `src/app/(main)/page.tsx` |
| 생성 | `src/lib/loading-phrases.ts`, `src/db/migrations/001_add_meanings.sql` |
| 생성 | `src/app/api/words/reclassify/route.ts` |
| 삭제 | `src/components/search/search-input.tsx` |

### ✅ Phase 5: 사용자 기능 (단어장, 검색 이력, 성적 관리) (완료)
**완료 일시:** 2026-02-15 09:00 (KST)

#### Step 5.1: 단어장 기능 ✅
- `src/app/api/vocabulary/route.ts`: 단어장 CRUD API (GET/POST/DELETE/PATCH, 100개 제한)
- `src/hooks/use-vocabulary.ts`: 단어장 상태 관리 훅 (word_id Set 캐싱)
- `src/components/search/word-card.tsx` 수정: ⭐ 단어장 추가/제거 버튼 (왼쪽 배치, 큰 아이콘)
- `src/app/(main)/vocabulary/page.tsx`: 단어장 페이지 (카드 그리드, 필터, 암기 토글, 상세 팝업, 삭제)

#### Step 5.2: 검색 이력 페이지 ✅
- `src/app/api/history/route.ts`: 검색 이력 조회 API (페이지네이션)
- `src/app/(main)/history/page.tsx`: 날짜별 그룹, 클릭 시 WordCard 펼침

#### Step 5.3: 성적 관리 페이지 ✅
- recharts@3.7.0 설치
- `src/app/api/scores/route.ts`: 성적 CRUD API
- `src/app/(main)/scores/page.tsx`: 탭 UI (입력 폼 / 테이블 / LineChart)

#### Step 5.4: 네비게이션 업데이트 ✅
- `src/components/layout/header.tsx` 수정: 검색 이력 + 성적 관리 링크 추가, 모바일 드롭다운 메뉴

#### Step 5.5: 설정 영속성 + Sheet 닫기 ✅
- `src/app/api/users/preferences/route.ts` 생성: display_preferences DB 저장 API
- 로그인 시 localStorage + DB 이중 저장, 저장 시 Sheet 자동 닫기

#### Step 5.6: 테스트 피드백 UX 개선 5건 ✅
- 별 버튼: 단어명 왼쪽 이동 + 크기 확대
- 사이드바: 검색 기록 클릭 시 해당 결과로 스크롤 + 하이라이트
- 단어장: "상세" 버튼 + Dialog 팝업 (TEPS 학습 문장 로딩)
- GPT 프롬프트: 이미지 연상에 이모지 추가, 한국어 설명에서 TEPS 내용 분리

#### Step 5.7: 복합 품사(Multi-POS) 지원 ✅
- GPT 프롬프트: 슬래시(/) 구분 복합 품사 생성, meanings 최대 5개
- UI: `part_of_speech.split('/')` 후 각각 Badge 렌더링

#### Step 5.8: 로그인 가드 UX 개선 + 필드 순서 리셋 ✅
- 각 페이지별 친근한 로그인 유도 메시지 + 기능 소개
- localStorage 버전 기반 fieldOrder 자동 리셋 시스템

#### Step 5.9: 기존 DB 단어 품사 재확인 ✅
- `src/app/api/words/recheck-pos/route.ts`: 배치 GPT 재확인 API
- 25개 단어 전체 확인 완료 (14개 업데이트, convict "명사/동사" 등)

#### Step 5.7: 복합 품사(Multi-POS) 지원 ✅
**완료 일시:** 2026-02-15 07:00 (KST)

- **배경**: 하나의 단어가 명사/동사 등 여러 품사로 쓰이는 경우 처리 필요
- **방안 선택**: Option C (프롬프트 + UI 변경, DB 스키마 변경 없음)
- `src/lib/word-generator.ts` 수정:
  - 규칙 1: "여러 품사로 쓰이는 단어는 part_of_speech에 슬래시(/)로 구분" 추가
  - 규칙 8: meanings 최대 3개 → 5개 (복합 품사 수용)
  - 규칙 9 (신규): "part_of_speech는 슬래시(/) 구분으로 복합 품사 명시"
  - max_tokens: 1500 → 2000
- `src/components/search/word-card.tsx` 수정:
  - `part_of_speech.split('/')` 후 각각 Badge 렌더링 (예: `명사` `동사` 별도 뱃지)
- `src/app/(main)/vocabulary/page.tsx` 수정: 동일한 Badge 분리 적용

#### Step 5.8: 로그인 가드 UX 개선 + 필드 순서 리셋 ✅
**완료 일시:** 2026-02-15 08:00 (KST)

- **로그인 가드 메시지 개선**: 딱딱한 "로그인이 필요합니다" → 친근한 기능 소개 문구로 변경
  - `/vocabulary`: "나만의 단어장을 만들어 보세요" + 기능 설명
  - `/history`: "어떤 단어를 공부했는지 한눈에" + 기능 설명
  - `/scores`: "TEPS 성적을 기록하고 추이를 확인하세요" + 기능 설명
- **필드 순서 리셋 시스템**: `src/hooks/use-display-preferences.ts` 수정
  - `STORAGE_VERSION_KEY` + `CURRENT_PREFS_VERSION` 도입
  - 버전 변경 시 fieldOrder를 최신 기본순으로 자동 리셋 (visibleFields는 유지)
  - 기본 순서: image_text → meanings → description → teps_point → example → paraphrasing → comparisons → description_en → synonyms → antonyms

#### Step 5.9: 기존 DB 단어 품사 재확인 API ✅
**완료 일시:** 2026-02-15 09:00 (KST)

- `src/app/api/words/recheck-pos/route.ts` 생성: 일회용 배치 품사 재확인 API
  - DB 전체 단어를 10개씩 배치로 GPT-4o-mini에 전달
  - 복합 품사(슬래시 표기) + meanings 재확인
  - 변경된 단어만 DB 업데이트
- **실행 결과**: 25개 단어 전체 확인, 14개 업데이트, 1개(convict) "동사" → "명사/동사" 복합 품사 변환

**Phase 5 생성 파일:** 9개, **수정 파일:** 9개
**설치 패키지:** recharts@3.7.0
**빌드 검증:** ✅ 성공 (에러 없음)

---

### ✅ Phase 7: 데이터 수집 시스템 (완료)
**완료 일시:** 2026-02-16 03:30 (KST)

- 서버 이벤트 10종 + 클라이언트 이벤트 4종 = **총 14종** 수집 시스템 구현
- `access_logs` 테이블을 범용 이벤트 저장소로 활용 (DB 변경 없음)
- 서버: fire-and-forget `logEvent()` 함수로 응답 블로킹 없이 기록
- 클라이언트: 배치 전송 (5초/5개) + `sendBeacon`으로 손실 방지
- 검색 로그에 IP/User-Agent 추가, 퀴즈 응답 시간 측정
- INVALID/LOW_VALUE 결과에 신고 버튼 추가
- `docs/event-tracking.md`: 전체 이벤트 레퍼런스 + SQL 쿼리 예시 10개
- **생성 파일:** 6개, **수정 파일:** 13개
- **빌드 검증:** ✅ 성공 (에러 없음)

---

## 기술 스택 요약

| 영역 | 기술 |
|------|------|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (이메일 + Google OAuth) |
| AI | OpenAI GPT-4o-mini (Gatekeeper + 단어 생성) |
| 차트 | Recharts (성적 추이 차트) |
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

## ✅ Phase 5: 사용자 기능 (단어장, 검색 이력, 성적 관리) (완료)
**완료 일시:** 2026-02-15 09:00 (KST)

### Step 5.1: 단어장 기능 ✅

#### API: `src/app/api/vocabulary/route.ts`
- **GET**: 사용자 단어장 목록 조회 (`user_vocabulary` JOIN `words`, user_id 필수)
- **POST**: 단어장에 단어 추가 (`{ wordId }`) — 100개 제한 체크 + 중복 체크
- **DELETE**: 단어장에서 단어 제거 (`{ vocabularyId }`)
- **PATCH**: 암기 완료 토글 (`{ vocabularyId, is_memorized }`)
- 인증 패턴: `createServerSupabaseClient()` → `getUser()` → `supabaseAdmin`으로 DB 조작

#### 단어장 상태 관리 훅: `src/hooks/use-vocabulary.ts`
- 로그인 시 사용자의 단어장 word_id Set 캐싱
- `isInVocabulary(wordId)`, `addToVocabulary(wordId)`, `removeFromVocabulary(wordId)`
- `vocabularyItems` 전체 목록 (vocabulary 페이지용)
- `toggleMemorized(vocabId)`, `count` (현재 개수)

#### 단어 카드에 단어장 추가 버튼: `src/components/search/word-card.tsx` (수정)
- 로그인 사용자에게만 ⭐ 버튼 표시 (CardHeader 우측, LevelBadge 옆)
- 이미 단어장에 있으면 ★(노란 채워진 별), 없으면 ☆(빈 별)
- 클릭 시 POST/DELETE → toast 피드백
- 100개 초과 시 "단어장이 가득 찼습니다" toast

#### 단어장 페이지: `src/app/(main)/vocabulary/page.tsx`
- 로그인 필수 (비로그인 시 로그인 유도 UI)
- 카드 그리드 레이아웃 (단어명, 발음, 뜻 요약, 난이도 뱃지)
- 상단: 단어 수 표시 (n/100), 필터 버튼
- 필터: 전체 / 미암기 / 암기완료
- 각 카드에 암기 토글(체크) + 삭제(휴지통) 버튼
- 빈 상태: "아직 단어장에 추가한 단어가 없습니다"

### Step 5.2: 검색 이력 페이지 ✅

#### API: `src/app/api/history/route.ts`
- **GET**: `user_word_history` JOIN `words` 조회 (user_id 필수, 최근순 정렬)
- 쿼리: `?page=1&limit=20` 페이지네이션 지원
- 응답: `{ items, total, page, limit, hasMore }`

#### 검색 이력 페이지: `src/app/(main)/history/page.tsx`
- 로그인 필수 (비로그인 시 로그인 유도 UI)
- 날짜별 그룹 (오늘, 어제, 이번 주, 이전)
- 각 항목: 단어 + 난이도 뱃지 + meanings 요약 + 검색 시간
- 클릭 시 해당 단어 상세 카드 펼침/접기 (WordCard 재사용)
- "더 보기" 버튼으로 페이지네이션
- 빈 상태: "검색 이력이 없습니다"

### Step 5.3: 성적 관리 페이지 ✅

#### 패키지 설치
- `recharts@3.7.0` 추가

#### API: `src/app/api/scores/route.ts`
- **GET**: 사용자 성적 목록 조회 (시험일 순)
- **POST**: 성적 입력 (`{ round, listening, vocabulary, grammar, reading, total, exam_date }`)
- **PUT**: 성적 수정 (`{ scoreId, ...fields }`)
- **DELETE**: 성적 삭제 (`{ scoreId }`)

#### 성적 페이지: `src/app/(main)/scores/page.tsx`
- 로그인 필수
- 탭 구조: [성적 입력] [성적 목록] [추이 차트]
- **성적 입력 폼**: 회차, 청해, 어휘, 문법, 독해, 총점(자동 합산), 시험일
- **성적 목록**: 테이블 형태 (회차, 영역별 점수, 총점, 시험일, 수정/삭제 버튼)
- **추이 차트**: recharts LineChart (총점 추이 / 영역별 추이 선택 가능)
  - 총점: 인디고 라인
  - 영역별: 청해(노랑), 어휘(초록), 문법(파랑), 독해(빨강)
- 빈 상태: "아직 입력된 성적이 없습니다"

### Step 5.4: 네비게이션 업데이트 ✅

#### Header: `src/components/layout/header.tsx` (수정)
- 기존 "AI 채팅" 링크 → "검색 이력" (`/history`)으로 변경
- "성적 관리" (`/scores`) 링크 추가
- 네비게이션 순서: 단어 검색 | 내 단어장 | 검색 이력 | 성적 관리 | 퀴즈
- 모바일 대응: `md:` 이상은 가로 네비, 모바일은 DropdownMenu 적용
- 사용자 이름 모바일에서 숨김 (`hidden sm:inline`)

### Phase 5 파일 변경 요약

| 구분 | 파일 | 내용 |
|------|------|------|
| 생성 | `src/app/api/vocabulary/route.ts` | 단어장 CRUD API (GET/POST/DELETE/PATCH) |
| 생성 | `src/app/api/history/route.ts` | 검색 이력 조회 API (페이지네이션) |
| 생성 | `src/app/api/scores/route.ts` | 성적 CRUD API (GET/POST/PUT/DELETE) |
| 생성 | `src/hooks/use-vocabulary.ts` | 단어장 상태 관리 훅 |
| 생성 | `src/app/(main)/vocabulary/page.tsx` | 단어장 페이지 |
| 생성 | `src/app/(main)/history/page.tsx` | 검색 이력 페이지 |
| 생성 | `src/app/(main)/scores/page.tsx` | 성적 관리 페이지 |
| 수정 | `src/components/search/word-card.tsx` | ⭐ 단어장 추가 버튼 |
| 수정 | `src/components/layout/header.tsx` | 네비게이션 링크 변경 + 모바일 드롭다운 |

### Step 5.5: 설정 영속성 + Sheet 닫기 개선 ✅
**완료 일시:** 2026-02-15 05:00 (KST)

- `src/app/api/users/preferences/route.ts` 생성: PUT 엔드포인트 (display_preferences DB 저장)
- `src/hooks/use-display-preferences.ts` 수정: 로그인 시 localStorage + DB 이중 저장
- `src/components/search/card-customizer.tsx` 수정: Sheet을 controlled 상태로 전환, 저장 시 자동 닫기

### Step 5.6: 테스트 피드백 반영 (UX 개선 5건) ✅
**완료 일시:** 2026-02-15 06:00 (KST)

#### 5.6.1: 별(단어장 추가) 버튼 위치 및 크기 변경 ✅
- `src/components/search/word-card.tsx` 수정
- 별 버튼을 단어명 **오른쪽**에서 **왼쪽**으로 이동 (h3 앞)
- 아이콘 크기 `h-4 w-4` → `h-6 w-6`로 확대, 버튼 `h-9 w-9`

#### 5.6.2: 사이드바 검색 기록 클릭 기능 ✅
- `src/contexts/search-context.tsx` 수정: `scrollToItem(id)` 함수 추가
- `src/app/(main)/page.tsx` 수정: 각 결과에 `data-search-id` 속성 추가
- `src/components/layout/sidebar.tsx` 수정: 항목 클릭 시 해당 결과로 스크롤 + 2초 하이라이트

#### 5.6.3: 단어장 "상세" 버튼 + 팝업 ✅
- `src/app/(main)/vocabulary/page.tsx` 수정
- 각 카드에 `Eye` (상세) 아이콘 버튼 추가
- 클릭 시 Dialog 팝업으로 전체 WordCard 표시 (사용자 카드 설정 반영)
- 로딩 중 TEPS 학습 문장 표시 (`loading-phrases.ts` 활용)

#### 5.6.4: 이미지 연상 텍스트에 이모지 추가 ✅
- `src/lib/word-generator.ts` 수정
- GPT 프롬프트 규칙 3번: "해당 단어를 연상할 수 있는 이모지 1개로 시작"
- JSON 형식 힌트: `"🎯 이모지로 시작하는 이미지 연상 텍스트"`

#### 5.6.5: 한국어 설명에서 TEPS 관련 내용 분리 ✅
- `src/lib/word-generator.ts` 수정
- 규칙 7번: "description은 순수한 뜻과 용법만, TEPS 출제 경향은 teps_point에서 다룸"
- description과 teps_point 역할 분리 명확화

**Phase 5 검증 결과:**
- TypeScript 타입 체크: ✅ 에러 없음
- ESLint: ✅ 에러 없음 (warning 1건 - useEffect dependency, 기능 무관)
- 프로덕션 빌드: ✅ 성공
  - `/vocabulary` 9.41 kB, `/history` 3.47 kB, `/scores` 112 kB (recharts 포함)
- 설치 패키지: recharts@3.7.0

**테스트 체크리스트:**
- [ ] 단어 검색 후 ⭐ 클릭 → 단어장에 추가 확인
- [ ] 단어장 100개 제한 도달 시 안내 메시지
- [ ] 암기 완료 토글 → DB 반영 확인
- [ ] `/vocabulary` → 단어장 목록, 필터(전체/미암기/암기완료), 삭제 동작
- [ ] `/history` → 날짜별 검색 이력, 클릭 시 단어 카드 펼침
- [ ] `/scores` → 성적 입력/수정/삭제, 차트 표시
- [ ] 비로그인 → 각 페이지 접근 시 로그인 유도 UI
- [ ] 모바일 헤더 드롭다운 메뉴 동작

**커밋:** `git commit -m "feat: implement vocabulary, history, and score management"`

---

### ✅ Phase 6: 퀴즈 시스템 (완료)
**완료 일시:** 2026-02-15 12:00 (KST)

#### Step 6.1: 퀴즈 API + 로직 ✅
- `src/app/api/quiz/route.ts`: 퀴즈 생성 API
  - 사용자 단어장에서 랜덤 정답 단어 선택
  - words 테이블에서 같은 품사 오답 우선 → 부족 시 다른 품사 fallback
  - 4지선다 셔플 + correctIndex 반환
  - 단어장 4개 미만 시 퀴즈 불가 안내

#### Step 6.2: 퀴즈 UI ✅
- `src/app/(main)/quiz/page.tsx`
  - 설정 화면: 퀴즈 유형(영→한/한→영), 문제 수(5/10/전체)
  - 진행 화면: 진행률 바, 4지선다, 정답/오답 피드백
  - 결과 화면: 점수, 틀린 단어 목록, 다시 풀기/단어장 이동

---

### ✅ Phase 6.5: 퀴즈 시스템 개선 + 단어 업로드 (완료)
**완료 일시:** 2026-02-15 (KST)

사용자 피드백 기반 5가지 개선사항 반영.

#### Step 6.5.1: 퀴즈 보기 품사 접두어 제거 ✅
- `src/app/api/quiz/route.ts`: `stripPOS()` 함수 추가
- `meanings[0]`의 `"(명) 우호"` → `"우호"` 형태로 품사 접두어 제거
- 보기(options) 생성 시 적용

#### Step 6.5.2: 결과 화면 "다른 문제 풀기" 버튼 ✅
- `src/app/(main)/quiz/page.tsx` 결과 화면에 3개 액션 버튼:
  - "다시 풀기" (같은 설정 재시작)
  - "다른 문제 풀기" (idle 설정 화면으로 이동)
  - "단어장으로" (vocabulary 이동)

#### Step 6.5.3: 퀴즈 설정 화면 개선 ✅
- **퀴즈 유형**: `ko2en` 제거, `en2ko` 고정 (유형 선택 UI 삭제)
- **문제 수**: 5/10/전체 버튼 → 1~20 슬라이더 (`<input type="range">`)
- **퀴즈 범위**: 체크박스 3개로 소스 선택
  - 단어장 미암기 단어 (기본 체크)
  - 단어장 암기완료 단어
  - 검색 이력 단어 (체크 시 날짜 입력 필드 표시)
- API: `source=unmemorized,memorized,history&historyDate=2026-02-14` 파라미터 확장
- 소스별 단어 수집 → word.id 기준 중복 제거 → 4개 미만 에러

#### Step 6.5.4: 오답 복습 마킹 시스템 ✅
- **DB 변경**: `user_vocabulary`에 `needs_review boolean DEFAULT false` 컬럼 추가
- **타입 변경**: `src/types/database.ts` `UserVocabulary`에 `needs_review: boolean` 추가
- **API 변경**: `src/app/api/vocabulary/route.ts` PATCH에 `needs_review` 필드 지원
- **복습 API**: `src/app/api/vocabulary/review/route.ts` 생성 (word_id 기반 복습 표시)
- **퀴즈 결과**: 틀린 단어별 "복습 표시" 버튼 + "모두 복습 표시" 일괄 버튼
- **단어장 UI**: 주황색 "복습" 배지 (클릭 해제), 필터에 "복습필요" 옵션 추가

#### Step 6.5.5: Excel/CSV 단어 일괄 업로드 ✅
- **패키지**: `xlsx` 라이브러리 추가 (클라이언트 파일 파싱)
- **단어장 UI**: "단어 일괄 추가" 버튼 + Dialog
  - 파일 선택 (.xlsx, .xls, .csv)
  - A열에서 영단어만 필터링 (`/^[a-zA-Z\s-]+$/`), 한글 제외
  - 최대 50개, 단어장 잔여 용량 체크
- **Bulk API**: `src/app/api/vocabulary/bulk/route.ts` 생성
  - DB 기존 단어 → 즉시 단어장 추가
  - 새 단어 → GPT `generateWordData()` 생성 → words INSERT → user_vocabulary INSERT
  - NDJSON 스트리밍 응답으로 진행률 실시간 전송
- **진행률 UI**: 진행률 바 + 단어별 상태 (✅ 완료 / 🔄 생성 중 / ❌ 실패) + 완료 결과 요약

**Phase 6.5 파일 변경 요약:**

| 구분 | 파일 | 내용 |
|------|------|------|
| 수정 | `src/app/api/quiz/route.ts` | 품사 제거 + 범위 쿼리 + en2ko 고정 |
| 수정 | `src/app/(main)/quiz/page.tsx` | 버튼 추가 + 설정 개선 + 복습 표시 |
| 수정 | `src/types/database.ts` | UserVocabulary에 needs_review 추가 |
| 수정 | `src/app/api/vocabulary/route.ts` | PATCH에 needs_review 지원 |
| 수정 | `src/app/(main)/vocabulary/page.tsx` | 복습 배지/필터 + 업로드 Dialog |
| 생성 | `src/app/api/vocabulary/review/route.ts` | word_id 기반 복습 표시 API |
| 생성 | `src/app/api/vocabulary/bulk/route.ts` | 벌크 업로드 API (NDJSON 스트리밍) |

**설치 패키지:** xlsx (클라이언트 Excel/CSV 파싱)
**DB 변경:** `ALTER TABLE user_vocabulary ADD COLUMN needs_review boolean DEFAULT false;`
**빌드 검증:** ✅ 성공 (에러 없음)

#### Step 6.5.6: 테스트 피드백 반영 (UX 개선 4건) ✅
**완료 일시:** 2026-02-15 (KST)

##### 6.5.6-1: Toast 알림 자동 닫힘 (3초) ✅
- `src/hooks/use-toast.ts`: `TOAST_REMOVE_DELAY`를 `1000000` → `3000`으로 변경
- `toast()` 함수에 `setTimeout(() => dismiss(), 3000)` 자동 dismiss 추가
- 앱 전체 모든 toast가 3초 후 자동으로 사라짐

##### 6.5.6-2: 퀴즈 검색이력 날짜 선택 모드 (특정 날짜 / 기간 설정) ✅
- `src/app/(main)/quiz/page.tsx`: 라디오 버튼으로 "특정 날짜" / "기간 설정" 모드 선택
  - 특정 날짜: 해당 날짜에 검색한 단어 (기존)
  - 기간 설정: 시작일~종료일 범위 내 검색 단어
- `src/app/api/quiz/route.ts`: `historyDateTo` 파라미터 추가, `.lt()` 조건으로 종료일 필터링

##### 6.5.6-3: 벌크 업로드 메시지 통일 + 실패 상세 정보 ✅
- `src/app/api/vocabulary/bulk/route.ts`:
  - 기존 "DB에서 추가" / "새로 생성" → 통일된 `status: 'added'` ("추가 완료")
  - 새 단어 생성 전 `evaluateWithGatekeeper()` 검증 추가
  - 실패 시 `correction` (교정 제안) + `gkStatus` (판별 상태) + `error` (사유) 반환
- `src/app/(main)/vocabulary/page.tsx`: 진행률 UI 통일 + 실패 시 "사유 → 교정 단어" 표시

##### 6.5.6-4: 모바일 UI 개선 ✅
- **헤더 네비게이션 이동**: `src/components/layout/header.tsx`
  - 모바일 메뉴를 왼쪽에서 **오른쪽**(프로필 옆)으로 이동
  - 아이콘을 `≡`(Menu) → `⋮`(MoreVertical)로 변경
  - 메뉴 항목에 아이콘 추가 (Search, BookOpen, History, BarChart3, Brain)
- **모바일 사이드바 제거**: `src/app/(main)/layout.tsx`
  - 좌측 고정 햄버거 버튼(Sheet 트리거) 완전 제거
  - 데스크톱 사이드바만 유지
- **검색 기록 바텀 시트**: `src/app/(main)/page.tsx`
  - 검색 페이지 우측 하단에 History FAB 버튼 (모바일만)
  - 클릭 시 하단에서 올라오는 바텀 시트로 검색 기록 표시 (70vh)
  - Sidebar 컴포넌트 재사용
- **최근 검색 칩**: 검색 입력창 상단에 최근 검색 단어 5개 칩 표시 (모바일만)
  - 클릭 시 해당 결과로 스크롤

**빌드 검증:** ✅ 성공 (에러 없음)

---

### ✅ Phase 7: 데이터 수집 시스템 (완료)
**완료 일시:** 2026-02-16 03:30 (KST)

사용자 데이터 수집 시스템 구현. 접속 로그, 검색 패턴, 학습 행동 등 모든 가치 있는 데이터를 `access_logs` 테이블(action + metadata JSONB)에 기록. DB 변경 없이 구현.

#### Step 7.1: 기반 인프라 정리 ✅
- `getSessionId()` 중복 제거: `page.tsx`, `multi-search-input.tsx` 하단 함수 삭제 → `import { getSessionId } from '@/lib/session'`으로 통합
- `src/types/database.ts`: AccessLog 타입에 `session_id`, `page`, `metadata` 필드 추가
- `src/lib/event-logger.ts` 생성: 서버사이드 fire-and-forget 이벤트 로거
  - `logEvent({ sessionId, userId?, page, action, metadata? })` 함수
  - `Promise.resolve()` 래핑으로 Supabase PromiseLike 타입 호환

#### Step 7.2: 검색 API 이벤트 보강 ✅
- `src/app/api/words/search/route.ts`:
  - request headers에서 `x-forwarded-for` / `x-real-ip` → ip, `user-agent` → ua 추출
  - `search_logs` INSERT에 `ip_address`, `user_agent` 추가
  - 기존 단어 검색 + Gatekeeper 검색 모두 `word_search` 이벤트 기록

#### Step 7.3: 단어장 이벤트 추적 ✅
- `src/hooks/use-vocabulary.ts`: API 호출 시 body에 `sessionId: getSessionId()` 포함
- `src/app/api/vocabulary/route.ts`:
  - POST → `vocab_add` 이벤트 (word_id, word)
  - DELETE → `vocab_remove` 이벤트 (word_id)
  - PATCH → `vocab_memorize` 이벤트 (word_id, is_memorized) + `vocab_review` 이벤트 (word_id, needs_review)
- `src/app/api/vocabulary/bulk/route.ts`: 완료 시점에 `vocab_bulk` 이벤트 (total, added, skipped, failed)

#### Step 7.4: 퀴즈 이벤트 추적 ✅
- `src/app/api/quiz/route.ts`: `sessionId` 쿼리 파라미터 수신 → `quiz_start` 이벤트 (count, source, historyDate)
- `src/app/(main)/quiz/page.tsx`:
  - `questionStartTime` ref 추가: 문제 표시 시 `Date.now()` 기록
  - `handleAnswer`에서 `timeMs = Date.now() - questionStartTime` 계산
  - `AnswerRecord`에 `timeMs` 필드 추가
  - 마지막 문제 완료 시 `sendQuizComplete()` 호출
- `src/app/api/quiz/complete/route.ts` 생성:
  - POST body: `{ sessionId, answers: [{word, correct, timeMs}], total, correct, score, avgTimeMs }`
  - 각 답변을 `quiz_answer` 이벤트로, 전체를 `quiz_complete` 이벤트로 기록

#### Step 7.5: 클라이언트 분석 시스템 ✅
- `src/lib/analytics.ts` 생성: 배치 이벤트 라이브러리
  - 메모리 큐잉 → 5초 또는 5개 이벤트마다 배치 전송
  - 페이지 이탈 시 `navigator.sendBeacon()` 전송
  - 싱글턴 패턴, 실패 시 큐 재추가 (최대 50개)
- `src/app/api/analytics/route.ts` 생성: 배치 수신 API
  - POST `{ events: [...] }` → access_logs bulk insert (최대 50개)
- 클라이언트 이벤트 통합:
  - `src/app/(main)/page.tsx`: `session_start` (referrer, screen, lang)
  - `src/components/search/recommended-words.tsx`: `recommended_click` (word)
  - `src/hooks/use-pronunciation.ts`: `pronunciation_play` (word)
  - `src/components/search/card-customizer.tsx`: `card_customize` (settings)

#### Step 7.6: 단어 신고 시스템 ✅
- `src/app/api/reports/route.ts` 생성: POST `{ sessionId, word, reason, gkStatus }` → `word_report` 이벤트
- `src/components/search/search-results.tsx`:
  - INVALID / LOW_VALUE 결과에 "이 결과 신고" 버튼 추가
  - 클릭 시 API 호출 + toast "신고 접수 완료"
  - 중복 신고 방지 (reported 상태 관리)

**Phase 7 수집 이벤트 전체 목록 (14종):**

| 구분 | action | metadata | 소스 |
|------|--------|----------|------|
| 서버 | `word_search` | word, status, ip, ua | search API |
| 서버 | `vocab_add` | word_id, word | vocabulary POST |
| 서버 | `vocab_remove` | word_id | vocabulary DELETE |
| 서버 | `vocab_memorize` | word_id, is_memorized | vocabulary PATCH |
| 서버 | `vocab_review` | word_id, needs_review | vocabulary PATCH |
| 서버 | `vocab_bulk` | total, added, skipped, failed | bulk API |
| 서버 | `quiz_start` | count, source, historyDate? | quiz API |
| 서버 | `quiz_answer` | word, correct, timeMs | quiz complete API |
| 서버 | `quiz_complete` | total, correct, score, avgTimeMs | quiz complete API |
| 서버 | `word_report` | word, reason, gk_status | reports API |
| 클라 | `session_start` | referrer, screen, lang | page.tsx |
| 클라 | `recommended_click` | word | recommended-words |
| 클라 | `pronunciation_play` | word | use-pronunciation |
| 클라 | `card_customize` | settings | card-customizer |

**Phase 7 파일 변경 요약:**

| 구분 | 파일 | 내용 |
|------|------|------|
| 생성 | `src/lib/event-logger.ts` | 서버사이드 fire-and-forget 이벤트 로거 |
| 생성 | `src/app/api/quiz/complete/route.ts` | 퀴즈 완료 API |
| 생성 | `src/lib/analytics.ts` | 클라이언트 배치 이벤트 라이브러리 |
| 생성 | `src/app/api/analytics/route.ts` | 클라이언트 이벤트 배치 수신 API |
| 생성 | `src/app/api/reports/route.ts` | 단어 신고 API |
| 생성 | `docs/event-tracking.md` | 이벤트 추적 시스템 문서 |
| 수정 | `src/types/database.ts` | AccessLog에 session_id, page, metadata 추가 |
| 수정 | `src/app/(main)/page.tsx` | getSessionId 통합, session_start 이벤트 |
| 수정 | `src/components/search/multi-search-input.tsx` | getSessionId 통합 |
| 수정 | `src/app/api/words/search/route.ts` | ip/ua 추출, word_search 이벤트 |
| 수정 | `src/hooks/use-vocabulary.ts` | sessionId 전달 |
| 수정 | `src/app/api/vocabulary/route.ts` | vocab_add/remove/memorize/review 이벤트 |
| 수정 | `src/app/api/vocabulary/bulk/route.ts` | vocab_bulk 이벤트 |
| 수정 | `src/app/api/quiz/route.ts` | quiz_start 이벤트 |
| 수정 | `src/app/(main)/quiz/page.tsx` | 답변 시간 측정 + 완료 데이터 전송 |
| 수정 | `src/components/search/recommended-words.tsx` | recommended_click 이벤트 |
| 수정 | `src/hooks/use-pronunciation.ts` | pronunciation_play 이벤트 |
| 수정 | `src/components/search/card-customizer.tsx` | card_customize 이벤트 |
| 수정 | `src/components/search/search-results.tsx` | 신고 버튼 추가 |

**설계 원칙:**
1. Fire-and-forget: 이벤트 로깅이 절대 사용자 응답을 블로킹하지 않음
2. access_logs 범용 저장소: DB 변경 없이 action + metadata JSONB로 모든 이벤트 구분
3. 클라이언트 배치 전송: 5초/5개 단위 + sendBeacon으로 이벤트 손실 방지

**빌드 검증:** ✅ 성공 (에러 없음)

---

## Phase 7 이전 구조 (참고용 원본)

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

## ✅ Phase 8: 마무리 및 배포 (개정판)
**완료 일시:** 2026-02-16 (Step 8.1~8.4 코드 구현)

> 초기 계획 대비 변경사항:
> - **삭제**: 동적 단어별 메타데이터 (개별 단어 페이지 없음), next/image (이미지 미사용), API 에러 표준화 (이미 완료), 네트워크 재시도 UI (이미 완료)
> - **추가**: favicon/manifest/PWA 기반, 보안 헤더, loading.tsx, Phase 4.5~7 QA 항목

**구현 결과:**
- Step 8.1: `icon.svg`, `apple-icon.tsx` (ImageResponse), `manifest.ts`, `robots.ts`, `sitemap.ts`, `opengraph-image.tsx` 생성. `layout.tsx` metadata 보강 (metadataBase, OG, Twitter). 페이지별 layout.tsx 메타데이터 (quiz, vocabulary, history, scores)
- Step 8.2: `error.tsx` (에러 바운더리 + 다시 시도 버튼), `global-error.tsx` (루트 에러 대응, 최소 HTML), `(main)/loading.tsx` (스피너)
- Step 8.3: `src/lib/supabase/middleware.ts`에 보안 헤더 5개 추가 (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control, X-Powered-By 제거)
- Step 8.4: `poweredBy`는 Next.js 15에서 미지원 옵션으로 확인 → 미들웨어 `X-Powered-By` 헤더 삭제로 대체. 번들 분석기는 배포 필수가 아니므로 생략

---

### Step 8.1: SEO + 정적 자산 ✅

#### 8.1.1: favicon 및 앱 아이콘
- `public/` 디렉토리 생성 (현재 없음)
- `public/favicon.ico` (32x32)
- `src/app/icon.tsx` 또는 `public/icon-192.png`, `public/icon-512.png` (PWA용)
- `public/apple-touch-icon.png` (180x180)
- `src/app/manifest.ts` 또는 `public/manifest.json`
  ```json
  {
    "name": "VocaLenz",
    "short_name": "VocaLenz",
    "description": "AI 기반 영어 단어 학습",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#000000",
    "icons": [...]
  }
  ```

#### 8.1.2: metadata 보강
- `src/app/layout.tsx`의 `metadata` 확장:
  ```ts
  export const metadata: Metadata = {
    title: { default: 'VocaLenz - AI 영어 단어장', template: '%s | VocaLenz' },
    description: 'TEPS/TOEIC 시험 대비를 위한 AI 기반 영어 단어 학습 플랫폼',
    keywords: ['영어 단어', 'TEPS', 'TOEIC', 'AI 단어장', '영어 학습'],
    authors: [{ name: 'VocaLenz' }],
    openGraph: {
      title: 'VocaLenz - AI 영어 단어장',
      description: 'AI가 만들어주는 나만의 영어 단어 학습 카드',
      url: 'https://vocalenz.vercel.app',
      siteName: 'VocaLenz',
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'VocaLenz - AI 영어 단어장',
      description: 'AI가 만들어주는 나만의 영어 단어 학습 카드',
    },
    metadataBase: new URL('https://vocalenz.vercel.app'),
  }
  ```
- 각 페이지에 `metadata` export 추가 (title template 활용):
  - `/quiz` → `title: '단어 퀴즈'`
  - `/vocabulary` → `title: '내 단어장'`
  - `/history` → `title: '검색 이력'`
  - `/scores` → `title: '성적 관리'`

#### 8.1.3: robots.ts
- `src/app/robots.ts` 생성
  ```ts
  export default function robots() {
    return {
      rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/'] },
      sitemap: 'https://vocalenz.vercel.app/sitemap.xml',
    }
  }
  ```

#### 8.1.4: sitemap.ts
- `src/app/sitemap.ts` 생성
- 정적 페이지 목록: `/`, `/auth/login`, `/auth/signup`
- 인증 필요 페이지는 제외 (검색엔진이 접근 불가)

#### 8.1.5: OG 이미지
- `src/app/opengraph-image.tsx` 생성 (Next.js ImageResponse API)
- 또는 정적 `public/og-image.png` (1200x630) 생성
- SNS 공유 시 미리보기에 표시

**파일:**
- 생성: `public/` 디렉토리 + favicon + 아이콘들, `src/app/manifest.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, OG 이미지
- 수정: `src/app/layout.tsx` (metadata 보강)

---

### Step 8.2: 에러 핸들링 + 로딩 UI

#### 8.2.1: 전역 에러 바운더리
- `src/app/error.tsx` 생성 ('use client')
  - 에러 메시지 표시 + "다시 시도" 버튼 (`reset()`)
  - 한국어 UI, 기존 디자인 시스템 활용

#### 8.2.2: 루트 에러 바운더리
- `src/app/global-error.tsx` 생성
  - root layout 자체가 깨졌을 때 대응
  - 최소한의 HTML (layout 없이 동작)

#### 8.2.3: 로딩 UI
- `src/app/(main)/loading.tsx` 생성
  - 페이지 전환 시 표시되는 스켈레톤/스피너
  - 메인 레이아웃(사이드바) 유지, 콘텐츠 영역만 로딩 표시

**파일:**
- 생성: `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/(main)/loading.tsx`

---

### Step 8.3: 보안 헤더

- `src/middleware.ts` 수정: 응답에 보안 헤더 추가
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-DNS-Prefetch-Control: on
  ```
- Supabase 세션 업데이트 응답 객체에 헤더 병합
- CSP는 인라인 스크립트(next/script, theme-provider)와 충돌 가능성이 있으므로 제외

**파일:**
- 수정: `src/middleware.ts` (또는 `src/lib/supabase/middleware.ts`)

---

### Step 8.4: 성능 최적화

#### 8.4.1: next.config.ts 설정
- `next.config.ts` 업데이트:
  ```ts
  const nextConfig: NextConfig = {
    poweredBy: false,  // X-Powered-By 헤더 제거
  }
  ```

#### 8.4.2: 번들 분석
- `@next/bundle-analyzer` 설치 (devDependencies)
- `pnpm build` 후 번들 크기 확인
- 현재 빌드 기준 주요 청크:
  - `/` (메인): 230KB (First Load JS)
  - `/scores`: 288KB (recharts 포함)
- 목표: First Load JS shared 100KB 이하 유지

#### 8.4.3: Lighthouse 점수 확인
- 개발 서버 또는 Vercel preview에서 Lighthouse 실행
- 목표: Performance 90+, Accessibility 90+, Best Practices 90+, SEO 90+
- 점수 기록 (프로젝트 플랜에 첨부)

**파일:**
- 수정: `next.config.ts`, `package.json` (devDependencies)

---

### Step 8.5: 최종 QA

**전체 기능 테스트 체크리스트 (Phase 1~7 전체 반영):**

**인증:**
- [ ] 회원가입 → 이메일 인증 → 로그인
- [ ] Google 소셜 로그인
- [ ] 로그아웃 → 재로그인 → 데이터 유지

**검색 (Phase 3~4):**
- [ ] 첫 방문 → 빈 상태 UI → 검색 → 채팅형 결과
- [ ] VALID 검색 → 단어 카드 표시 (뜻, 설명, 예문 등)
- [ ] TYPO 검색 → "혹시 ~ 찾으셨나요?" + 교정 버튼
- [ ] KOREAN 검색 → 관련 단어 목록 표시
- [ ] INVALID 검색 → 에러 메시지 + 신고 버튼
- [ ] LOW_VALUE 검색 → 부적합 안내 + 신고 버튼
- [ ] 제안 칩 / 추천 단어 클릭 → 정상 검색
- [ ] Rate limit 초과 시 안내 메시지

**카드 커스터마이징 (Phase 4.5):**
- [ ] 필드 토글 (표시/숨김) → 카드에 반영
- [ ] 필드 드래그 정렬 → 순서 반영
- [ ] 동시 검색 모드 변경 (1~4개) → 입력창 개수 변경
- [ ] 설정 저장 → 새로고침 후 유지

**단어장 (Phase 5):**
- [ ] 단어 추가/삭제 → 즉시 반영
- [ ] 암기완료 토글 → 상태 변경
- [ ] 복습 표시 → 주황 배지 표시 / 해제
- [ ] 필터 (전체/미암기/암기완료/복습필요)
- [ ] Excel/CSV 일괄 업로드 → 진행률 표시 → 결과 요약
- [ ] 단어장 100개 제한 동작

**퀴즈 (Phase 6~6.5):**
- [ ] 범위 선택 (미암기/암기/검색이력) → 정상 생성
- [ ] 검색이력: 특정 날짜 / 기간 설정
- [ ] 문제 수 슬라이더 (1~20) → 반영
- [ ] 4지선다 풀기 → 정답/오답 피드백
- [ ] 결과 화면: 점수, 틀린 단어, 복습 표시
- [ ] "다시 풀기" / "다른 문제 풀기" 동작

**기타 기능:**
- [ ] 검색 이력 페이지 → 날짜별 목록
- [ ] 성적 관리 → 입력/수정/삭제/그래프
- [ ] 발음 재생 (Web Speech API)
- [ ] 다크 모드 토글

**데이터 수집 (Phase 7):**
- [ ] Supabase `access_logs` 테이블에 이벤트 기록 확인
- [ ] `search_logs`에 ip_address, user_agent 기록 확인

**모바일 반응형:**
- [ ] 375px (iPhone SE) — 전체 UI 확인
- [ ] 768px (iPad) — 사이드바 표시/숨김
- [ ] 1440px (데스크톱) — 정상 레이아웃
- [ ] 모바일 헤더 메뉴 (⋮) 동작
- [ ] 검색 기록 바텀 시트 (모바일)
- [ ] 최근 검색 칩 (모바일)

**SEO/메타 (Phase 8):**
- [ ] 페이지별 title 표시 확인
- [ ] OG 태그 확인 (SNS 공유 미리보기)
- [ ] robots.txt 접근 확인
- [ ] sitemap.xml 접근 확인
- [ ] favicon 표시 확인

**에러 처리 (Phase 8):**
- [ ] 존재하지 않는 URL → 404 페이지
- [ ] 에러 발생 시 → error.tsx 동작
- [ ] 로딩 중 → loading.tsx 표시

---

### Step 8.6: Vercel 프로덕션 배포

```bash
git push origin main
```

Vercel이 자동으로 빌드 및 배포합니다.

**배포 전 확인:**
1. 환경변수 설정 확인 (Vercel Dashboard):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
2. 빌드 에러 없는지 확인

**배포 후 확인:**
1. 프로덕션 URL 접속 → 전체 기능 동작
2. Supabase Auth → URL Configuration에 프로덕션 URL 추가
3. Google OAuth → Authorized redirect URIs에 프로덕션 URL 추가
4. Lighthouse 점수 확인 및 기록
5. OG 태그 검증 (https://www.opengraph.xyz/ 등)

---

## 파일 변경 요약 (Phase 8)

| 구분 | 파일 | Step |
|------|------|------|
| 생성 | `public/favicon.ico` | 8.1.1 |
| 생성 | `public/icon-192.png`, `public/icon-512.png` | 8.1.1 |
| 생성 | `public/apple-touch-icon.png` | 8.1.1 |
| 생성 | `src/app/manifest.ts` | 8.1.1 |
| 생성 | `src/app/robots.ts` | 8.1.3 |
| 생성 | `src/app/sitemap.ts` | 8.1.4 |
| 생성 | `public/og-image.png` 또는 `src/app/opengraph-image.tsx` | 8.1.5 |
| 생성 | `src/app/error.tsx` | 8.2.1 |
| 생성 | `src/app/global-error.tsx` | 8.2.2 |
| 생성 | `src/app/(main)/loading.tsx` | 8.2.3 |
| 수정 | `src/app/layout.tsx` | 8.1.2 |
| 수정 | 각 페이지 page.tsx (metadata export) | 8.1.2 |
| 수정 | `src/middleware.ts` 또는 `src/lib/supabase/middleware.ts` | 8.3 |
| 수정 | `next.config.ts` | 8.4.1 |
| 수정 | `package.json` (devDependencies) | 8.4.2 |

## 구현 순서
Step 8.1 → 8.2 → 8.3 → 8.4 → `pnpm build` 검증 → Step 8.5 (수동 QA) → Step 8.6 (배포)

## 검증
1. 빌드 성공
2. favicon 브라우저 탭에 표시
3. `/robots.txt`, `/sitemap.xml` 접근 가능
4. OG 태그 SNS 미리보기 동작
5. 에러 페이지 정상 표시
6. 보안 헤더 응답에 포함
7. Lighthouse 90+ 달성

---

## ✅ Phase 9: UI/UX 개선 (완료)
**완료 일시:** 2026-02-16

### Step 9.1: 단어장 플래시카드 리디자인 ✅
- 플래시카드 뒤집기 애니메이션 (CSS 3D `rotateY`, GPU 가속)
- 카드 앞면: 단어 + 레벨/POS 배지 + 추가 날짜 (상대 시간)
- 카드 뒷면: 전체 뜻 + 발음 + 설명 + 예문 + 액션 버튼 바
- 복습 배지 강화 (`animate-pulse` + `ring-2 ring-orange-400/50` 테두리)
- 일괄 추가 버튼 → 헤더 우측 원형 아이콘 버튼으로 재배치
- 하단 검색 FAB (Floating Action Button) 추가
- 커밋: `53017a4 - feat: 단어장 플래시카드 UI 리디자인`

**생성 파일:**
- `src/components/vocabulary/vocabulary-flip-card.tsx` (플립카드 컴포넌트)
- `src/lib/date-utils.ts` (상대 시간 포맷 유틸리티)

**수정 파일:**
- `src/app/globals.css` (플립 애니메이션 CSS)
- `src/app/(main)/vocabulary/page.tsx` (카드 교체, FAB, 헤더 재구성)

### Step 9.2: 검색 페이지 DB 검색 이력 표시 ✅
- 빈 상태(초기 화면)에서 로그인 사용자에게 최근 검색 이력 20개 표시
- "더 보기" 버튼으로 20개씩 추가 로드 (기존 `/api/history` API 재활용)
- 시간순 정렬 (최신 우선), 상대 시간 표시 (방금, N분 전, N시간 전, N일 전)
- 이력 항목 클릭 시 해당 단어 재검색 실행

**수정 파일:**
- `src/app/(main)/page.tsx` (DB 이력 섹션 추가)

### Step 9.3: 헤더 로고 이미지 교체 + 네비게이션 수정 ✅
- 텍스트 로고 → `public/logo/VocaLenz_logo.png` 이미지 (Next.js `<Image>` 자동 최적화)
- 로고 클릭 시 검색 세션 히스토리 초기화 → 초기 검색 화면 복귀
- `SearchContext`에 커스텀 이벤트 리스너(`vocalenz:reset-search`) 추가
- **로고 교체 방법:** `public/logo/VocaLenz_logo.png` 파일을 같은 이름으로 덮어씌우면 자동 반영

**생성 파일:**
- `public/logo/VocaLenz_logo.png` (로고 이미지)

**수정 파일:**
- `src/components/layout/header.tsx` (Image 컴포넌트, handleLogoClick)
- `src/contexts/search-context.tsx` (리셋 이벤트 리스너)

### Step 9.4: 검색 페이지 심볼 영상 교체 ✅
- BookOpen 아이콘 → `public/video/VocaLenz_sample.mp4` 무한 반복 자동 재생
- `<video autoPlay loop muted playsInline>` (브라우저 자동재생 정책 준수)
- `h-20 w-20 rounded-2xl overflow-hidden` 스타일

**생성 파일:**
- `public/video/VocaLenz_sample.mp4` (심볼 영상)

**수정 파일:**
- `src/app/(main)/page.tsx` (video 태그 교체)

**Phase 9 커밋:** 2개
- `53017a4 - feat: 단어장 플래시카드 UI 리디자인`
- `75aa44b - feat: 검색 이력 표시, 로고 이미지, 심볼 영상 적용`

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
