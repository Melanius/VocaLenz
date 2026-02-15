# VocaLenz 이벤트 추적 시스템

## 개요

모든 이벤트는 `access_logs` 테이블에 저장됩니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | 자동 생성 |
| `session_id` | text | 브라우저별 고유 세션 (localStorage) |
| `user_id` | uuid | 로그인 사용자 ID (비로그인 시 null) |
| `page` | text | 이벤트 발생 페이지 경로 |
| `action` | text | 이벤트 종류 (아래 표 참고) |
| `metadata` | jsonb | 이벤트별 상세 데이터 |
| `created_at` | timestamptz | 기록 시각 |

---

## 서버 이벤트 (10종)

### word_search — 단어 검색
- **발생 시점**: 사용자가 단어를 검색할 때마다
- **page**: `/search`
- **metadata**:
  ```json
  {
    "word": "ephemeral",
    "status": "VALID",
    "ip": "123.456.789.0",
    "ua": "Mozilla/5.0 ..."
  }
  ```
- **status 값**: `VALID` (정상), `TYPO` (오타), `KOREAN` (한국어), `INVALID` (무효), `LOW_VALUE` (학습 부적합)
- **활용**: 인기 검색어 분석, 오타 패턴 파악, 지역별 사용자 분석

### vocab_add — 단어장 추가
- **발생 시점**: 사용자가 단어를 단어장에 추가할 때
- **page**: `/vocabulary`
- **metadata**:
  ```json
  {
    "word_id": "uuid-...",
    "word": "resilient"
  }
  ```
- **활용**: 어떤 단어가 가장 많이 저장되는지, 학습 관심 패턴

### vocab_remove — 단어장 삭제
- **발생 시점**: 사용자가 단어를 단어장에서 삭제할 때
- **page**: `/vocabulary`
- **metadata**:
  ```json
  {
    "word_id": "uuid-..."
  }
  ```
- **활용**: 어떤 단어가 자주 삭제되는지 (불만족 지표)

### vocab_memorize — 암기 완료 토글
- **발생 시점**: 사용자가 암기완료를 체크/해제할 때
- **page**: `/vocabulary`
- **metadata**:
  ```json
  {
    "word_id": "vocab-uuid-...",
    "is_memorized": true
  }
  ```
- **활용**: 암기 속도, 사용자별 학습 진행률

### vocab_review — 복습 표시
- **발생 시점**: 퀴즈에서 틀린 단어를 복습 표시할 때
- **page**: `/vocabulary`
- **metadata**:
  ```json
  {
    "word_id": "vocab-uuid-...",
    "needs_review": true
  }
  ```
- **활용**: 어려운 단어 파악, 복습 빈도

### vocab_bulk — 일괄 추가 완료
- **발생 시점**: 일괄 단어 추가가 모두 끝났을 때 (1회)
- **page**: `/vocabulary`
- **metadata**:
  ```json
  {
    "total": 10,
    "added": 7,
    "skipped": 2,
    "failed": 1
  }
  ```
- **활용**: 일괄 추가 사용 빈도, 성공률

### quiz_start — 퀴즈 시작
- **발생 시점**: 퀴즈 문제 생성 완료 시
- **page**: `/quiz`
- **metadata**:
  ```json
  {
    "count": 10,
    "source": "unmemorized,memorized",
    "historyDate": "2026-02-15"
  }
  ```
- **source 값**: `unmemorized`, `memorized`, `history` (쉼표 구분 복수 가능)
- **활용**: 퀴즈 설정 선호도, 문제 수 분포

### quiz_answer — 퀴즈 개별 답변
- **발생 시점**: 퀴즈 완료 시 각 답변별 1건씩 기록
- **page**: `/quiz`
- **metadata**:
  ```json
  {
    "word": "ubiquitous",
    "correct": false,
    "timeMs": 4523
  }
  ```
- **timeMs**: 문제 표시부터 답변 클릭까지 밀리초
- **활용**: 단어별 난이도 분석, 응답 시간으로 확신도 측정, 오답 패턴

### quiz_complete — 퀴즈 완료
- **발생 시점**: 퀴즈의 마지막 문제를 풀었을 때
- **page**: `/quiz`
- **metadata**:
  ```json
  {
    "total": 10,
    "correct": 7,
    "score": 70,
    "avgTimeMs": 3200
  }
  ```
- **활용**: 사용자별 실력 추이, 평균 점수, 학습 효과 측정

### word_report — 결과 신고
- **발생 시점**: INVALID/LOW_VALUE 결과에서 "이 결과 신고" 버튼 클릭 시
- **page**: `/search`
- **metadata**:
  ```json
  {
    "word": "asdfgh",
    "reason": "사용자 신고: 결과가 잘못되었습니다",
    "gk_status": "INVALID"
  }
  ```
- **활용**: Gatekeeper 오판 탐지, 모델 개선 피드백

---

## 클라이언트 이벤트 (4종)

> 클라이언트 이벤트는 메모리에 큐잉 후 **5초 또는 5개 단위**로 배치 전송됩니다.
> 페이지 이탈 시 `sendBeacon`으로 즉시 전송합니다.

### session_start — 세션 시작
- **발생 시점**: 앱 최초 로드 시 1회
- **page**: `/`
- **metadata**:
  ```json
  {
    "referrer": "https://google.com",
    "screen": "1920x1080",
    "lang": "ko-KR"
  }
  ```
- **활용**: 유입 경로 분석, 디바이스 분포, 언어권 분석

### recommended_click — 추천 단어 클릭
- **발생 시점**: 메인 페이지의 "오늘의 추천 단어" 클릭 시
- **page**: `/`
- **metadata**:
  ```json
  {
    "word": "amity"
  }
  ```
- **활용**: 추천 단어 클릭률, 어떤 단어가 관심을 끄는지

### pronunciation_play — 발음 재생
- **발생 시점**: 단어 카드에서 발음 버튼 클릭 시
- **page**: 현재 페이지 경로
- **metadata**:
  ```json
  {
    "word": "ephemeral"
  }
  ```
- **활용**: 발음 기능 사용률, 발음이 어려운 단어 파악

### card_customize — 카드 설정 변경
- **발생 시점**: 카드 표시 설정을 변경 후 저장할 때
- **page**: 현재 페이지 경로
- **metadata**:
  ```json
  {
    "settings": {
      "visibleFields": ["meanings", "description", "example"],
      "fieldOrder": ["meanings", "description", "example", ...]
    }
  }
  ```
- **활용**: 사용자가 선호하는 카드 구성, 불필요 필드 파악

---

## 메타데이터 조회 방법 (SQL)

### 기본 조회
```sql
-- 최근 이벤트 20건
SELECT action, metadata, created_at
FROM access_logs
ORDER BY created_at DESC
LIMIT 20;
```

### JSONB 필드 읽기

```sql
-- metadata에서 특정 키 꺼내기
SELECT
  action,
  metadata->>'word' AS word,           -- 텍스트로 꺼내기
  metadata->>'status' AS status,
  (metadata->>'timeMs')::int AS time_ms -- 숫자로 변환
FROM access_logs
WHERE action = 'quiz_answer';
```

**연산자 정리**:
| 연산자 | 설명 | 반환 타입 | 예시 |
|--------|------|-----------|------|
| `->` | 키로 접근 | jsonb | `metadata->'settings'` |
| `->>` | 키로 접근 | text | `metadata->>'word'` |
| `->` | 인덱스로 접근 | jsonb | `metadata->'items'->0` |
| `#>` | 경로로 접근 | jsonb | `metadata#>'{settings,visibleFields}'` |
| `#>>` | 경로로 접근 | text | `metadata#>>'{settings,visibleFields}'` |

### 실용 쿼리 예시

```sql
-- 1. 인기 검색어 TOP 10
SELECT
  metadata->>'word' AS word,
  COUNT(*) AS search_count
FROM access_logs
WHERE action = 'word_search'
GROUP BY metadata->>'word'
ORDER BY search_count DESC
LIMIT 10;

-- 2. 일별 검색 건수
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS searches
FROM access_logs
WHERE action = 'word_search'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 3. 퀴즈 평균 점수 추이
SELECT
  DATE(created_at) AS date,
  ROUND(AVG((metadata->>'score')::numeric)) AS avg_score,
  COUNT(*) AS quiz_count
FROM access_logs
WHERE action = 'quiz_complete'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 4. 가장 틀리는 단어 TOP 10
SELECT
  metadata->>'word' AS word,
  COUNT(*) AS wrong_count
FROM access_logs
WHERE action = 'quiz_answer'
  AND (metadata->>'correct')::boolean = false
GROUP BY metadata->>'word'
ORDER BY wrong_count DESC
LIMIT 10;

-- 5. 응답 시간이 긴 단어 (어려운 단어)
SELECT
  metadata->>'word' AS word,
  ROUND(AVG((metadata->>'timeMs')::numeric)) AS avg_time_ms
FROM access_logs
WHERE action = 'quiz_answer'
GROUP BY metadata->>'word'
ORDER BY avg_time_ms DESC
LIMIT 10;

-- 6. 디바이스/화면 크기 분포
SELECT
  metadata->>'screen' AS screen_size,
  COUNT(*) AS sessions
FROM access_logs
WHERE action = 'session_start'
GROUP BY metadata->>'screen'
ORDER BY sessions DESC;

-- 7. 신고된 단어 목록
SELECT
  metadata->>'word' AS word,
  metadata->>'gk_status' AS gk_status,
  COUNT(*) AS report_count,
  MAX(created_at) AS last_reported
FROM access_logs
WHERE action = 'word_report'
GROUP BY metadata->>'word', metadata->>'gk_status'
ORDER BY report_count DESC;

-- 8. 특정 사용자의 학습 활동 타임라인
SELECT action, metadata, created_at
FROM access_logs
WHERE user_id = '사용자-UUID-여기에'
ORDER BY created_at DESC
LIMIT 50;

-- 9. 발음 기능 사용률 (일별)
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS play_count
FROM access_logs
WHERE action = 'pronunciation_play'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 10. 액션별 전체 통계
SELECT
  action,
  COUNT(*) AS total,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(DISTINCT user_id) AS unique_users
FROM access_logs
GROUP BY action
ORDER BY total DESC;
```

---

## 추가 참고

### search_logs 테이블 (기존)
검색 전용 로그는 별도로 `search_logs` 테이블에도 저장됩니다.
```sql
SELECT word, gatekeeper_status, ip_address, user_agent, searched_at
FROM search_logs
ORDER BY searched_at DESC
LIMIT 20;
```

### 이벤트 흐름도
```
사용자 행동
  ├─ 서버 이벤트 → API route → logEvent() → access_logs INSERT (즉시)
  └─ 클라이언트 이벤트 → analytics.track() → 메모리 큐
                                                ├─ 5개 도달 → POST /api/analytics → bulk INSERT
                                                ├─ 5초 경과 → POST /api/analytics → bulk INSERT
                                                └─ 페이지 이탈 → sendBeacon → bulk INSERT
```
