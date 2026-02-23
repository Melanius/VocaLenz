# VocaLenz - Claude Code 컨텍스트

## 프로젝트 개요
TEPS 시험 대비 AI 기반 영어 단어 학습 플랫폼.
사용자가 단어/청해 구문을 검색하면 AI가 학습 카드를 생성하고, 단어장·퀴즈·성적 관리까지 제공.

**라이브 URL**: https://www.vocalenz.com
**개발 히스토리 전체**: `docs/PROJECT_PLAN_R1.md`

---

## 기술 스택
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Supabase (PostgreSQL + Auth)
- **AI**: OpenAI GPT-4o-mini (단어/표현 생성, TEPS 코치)
- **패키지 매니저**: pnpm
- **배포**: Vercel (main 브랜치 push → 자동 배포)

---

## 경로 정보
- **프로젝트 루트**: `/mnt/c/Users/hjlee/VocaLenz` (WSL 기준)
- **Windows 경로**: `C:\Users\hjlee\VocaLenz`
- **이미지 소스**: `C:\Users\hjlee\VocaLenz\image\logo\`
- **기획 문서**: `C:\Users\hjlee\OneDrive\Dev\VocaLenz\docs\`

---

## 현재 개발 상태 (Phase 32 완료 — 2026-02-23)
최신 커밋: `2cf6a64`

### 완성된 기능 목록
- AI 단어 검색 (Gatekeeper → WordGenerator → DB 캐시)
- AI 청해 구문 검색 (PHRASE 타입: 숙어/구동사/관용구)
- 단어/청해 구문 탭 토글 (`SearchMode: 'word' | 'expression'`)
- 채팅형 UI (검색 결과 버블 형태)
- WordCard / ExpressionCard 컴포넌트
- 카드 커스터마이징 (visibleFields, fieldOrder)
- 단어장 (단어/표현 각 100개 제한, 암기/복습 표시)
- 플립카드 (VocabularyFlipCard, ExpressionFlipCard)
- 검색창 자동 단어장 저장 (MultiSearchInput에서 VocabularyContext 직접 사용)
- 단어 일괄 추가 (Excel/CSV 업로드, 스트리밍 진행)
- 퀴즈 (4지선다, 범위 선택: 단어장/검색이력, 날짜 필터)
- 성적 관리 + TEPS 코치 AI 채팅
- 사이드바 토글 (데스크톱) + 모바일 바텀시트 히스토리
- 계절 테마 APNG 애니메이션 (spring/summer/fall/winter — 121프레임)
- 다크모드 / 온보딩 플로우 / 닉네임 시스템
- 관리자 페이지 (단어 CRUD + CSV 일괄 업로드)
- OG 이미지 (og-image.jpg, 117KB)
- PWA 아이콘 (home_img.png 기반, 흰 배경 maskable)

---

## 핵심 아키텍처

### 검색 로직 (중요)
- **단어 모드** → `words` 테이블만 (WORD·PHRASE 입력 모두 독해 카드 생성)
- **청해 구문 모드** → `expressions` 테이블만 (WORD·PHRASE 입력 모두 청해 카드 생성)
- Cross-table lookup 없음 — 같은 숙어가 두 테이블에 각각 다른 버전으로 존재 가능
- `autoRouted` 플래그 완전 제거됨

### Context 구조
```
SearchContext       — 검색 상태 (query, results, mode)
VocabularyContext   — 단어장 상태 (단어, star 동기화)
ExpressionVocabularyContext — 표현 단어장 상태
```

### 주요 타입
```typescript
GatekeeperStatus: 'WORD' | 'PHRASE' | 'TYPO' | 'KOREAN' | 'INVALID' | 'LOW_VALUE'
SearchMode: 'word' | 'expression'
difficulty_level: 1(Essential/초록) | 2(Core/파랑) | 3(Advanced/주황) | 4(Killer/빨강)
```

---

## 주요 파일 경로
```
src/app/(main)/page.tsx              — 홈 (검색창, 계절 이미지, 결과)
src/app/(main)/admin/page.tsx        — 관리자 페이지
src/app/api/words/search/route.ts    — 단어/표현 검색 API
src/app/api/admin/words/route.ts     — 관리자 단어 CRUD + CSV 업로드
src/components/search/multi-search-input.tsx  — 검색창 (자동 저장 로직 포함)
src/components/search/search-results.tsx      — 검색 결과 렌더링
src/contexts/vocabulary-context.tsx           — 단어장 Context
src/contexts/expression-vocabulary-context.tsx
src/hooks/use-vocabulary.ts
src/lib/supabase/admin.ts            — supabaseAdmin 클라이언트
src/lib/admin-auth.ts                — requireAdmin() 인증 가드
src/app/manifest.ts                  — PWA manifest
public/icons/                        — PWA 아이콘 (192/512, any/maskable)
public/apple-touch-icon.png          — iOS 홈화면 아이콘
public/video/{spring,summer,fall,winter}.png  — 계절 APNG (건드리지 말 것!)
```

---

## API 라우트 목록
```
POST /api/words/search          — 단어/표현 통합 검색
GET  /api/vocabulary            — 단어장 조회
POST /api/vocabulary            — 단어장 추가
GET  /api/vocabulary/expressions
POST /api/vocabulary/expressions
POST /api/vocabulary/bulk       — 대량 추가 (uploadType: 'word'|'expression')
GET  /api/quiz                  — 퀴즈 문제 생성
POST /api/quiz/complete         — 퀴즈 결과 저장
GET  /api/history               — 검색 이력
GET/PUT/POST/DELETE /api/admin/words   — 관리자 단어 관리
GET  /api/admin/dashboard       — 관리자 대시보드 통계
GET/PUT /api/admin/reports      — 신고 관리
```

---

## Supabase 테이블
`words`, `expressions`, `users`, `user_word_history`, `user_expression_history`,
`user_vocabulary`, `user_expressions`, `user_scores`, `search_logs`,
`failed_searches`, `word_reports`, `access_logs`

스키마 상세: `supabase_schema_part1~4.sql` 참조

---

## 개발 명령어
```bash
pnpm dev          # 개발 서버 (localhost:3000)
pnpm build        # 프로덕션 빌드
pnpm tsc --noEmit # 타입 체크
pnpm lint         # ESLint
```

## 주의사항
- `public/video/*.png` — 121프레임 APNG 애니메이션. JPEG 변환 금지
- 커밋 전 반드시 `pnpm tsc --noEmit` 실행
- main 브랜치 push = Vercel 자동 배포
- 관리자 인증은 `requireAdmin()` (lib/admin-auth.ts) 사용
