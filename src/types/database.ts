// Database types based on Supabase schema v1.7

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// v1.7: 단어 카드 표시 필드
export type WordCardField =
  | 'meanings'
  | 'description'
  | 'description_en'
  | 'image_text'
  | 'teps_point'
  | 'synonyms'
  | 'antonyms'
  | 'paraphrasing'
  | 'comparisons'
  | 'example'

// v1.7: 단어 카드 표시 설정
export interface DisplayPreferences {
  visibleFields: WordCardField[]    // 사용자가 선택한 표시 필드
  fieldOrder: WordCardField[]       // 필드 표시 순서
  searchMode: 1 | 2 | 3 | 4        // 동시 검색 단어 수
  autoSaveToVocabulary?: boolean    // 검색한 단어 자동 단어장 저장
}

export interface Word {
  id: string
  word: string
  exam_type: string
  part_of_speech: string | null
  pronunciation: string | null
  meanings: string[]                    // v1.8: 단답형 뜻 (품사 포함, 최대 3개)
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

export type UserRole = 'user' | 'admin'
export type SeasonTheme = 'spring' | 'summer' | 'fall' | 'winter'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  role: UserRole
  nickname: string | null
  target_score: number | null
  goal_message: string | null
  study_start_date: string | null
  birth_date: string | null
  phone: string | null
  theme: SeasonTheme
  target_exam: string
  display_preferences: DisplayPreferences
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface UserVocabulary {
  id: string
  user_id: string
  word_id: string
  is_memorized: boolean
  needs_review: boolean
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

export type GatekeeperStatus = 'WORD' | 'PHRASE' | 'TYPO' | 'KOREAN' | 'INVALID' | 'LOW_VALUE'

// 검색 모드
export type SearchMode = 'word' | 'expression'

export interface GatekeeperResponse {
  status: GatekeeperStatus
  canonical_form?: string    // PHRASE일 때 핵심 표현 (사전 표제어 형태)
  correction?: string        // TYPO일 때 수정 추천 단어
  suggestions?: string[]     // KOREAN일 때 추천 단어 목록
  reason: string             // 판별 사유
}

export interface WordGenerationResponse {
  word: string
  part_of_speech: string
  pronunciation: string
  meanings: string[]         // v1.8: 단답형 뜻 (품사 포함, 최대 3개)
  image_text: string
  description: string
  description_en: string     // v1.7: 영영 사전
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

export interface UserWordHistory {
  id: string
  user_id: string
  word_id: string
  searched_at: string
}

// --- 표현(Expression) 관련 타입 ---

export interface Expression {
  id: string
  expression: string
  exam_type: string
  meanings: string[]
  description: string | null
  teps_point: string | null
  context: string | null              // 대화 상황
  pronunciation_tip: string | null    // 발음/연음 팁
  listening_parts: string[]           // 출제 파트 (Part 1~5)
  paraphrasing: string[]
  comparisons: string[]
  example_sentence: string | null     // A/B 대화 형식
  example_translation: string | null
  difficulty_level: number
  search_count: number
  created_at: string
  updated_at: string
}

export interface UserExpression {
  id: string
  user_id: string
  expression_id: string
  is_memorized: boolean
  needs_review: boolean
  added_at: string
  expression?: Expression  // joined
}

export interface ExpressionGenerationResponse {
  expression: string
  meanings: string[]
  description: string
  teps_point: string
  context: string
  pronunciation_tip: string
  listening_parts: string[]
  paraphrasing: string[]
  comparisons: string[]
  example_sentence: string
  example_translation: string
  difficulty_level: number
}

// 표현 카드 표시 필드
export type ExpressionCardField =
  | 'meanings'
  | 'description'
  | 'teps_point'
  | 'context'
  | 'pronunciation_tip'
  | 'paraphrasing'
  | 'comparisons'
  | 'example'

// 검색 결과 통합 타입 (UI에서 사용)
export type SearchResult =
  | { type: 'word'; data: Word }
  | { type: 'expression'; data: Expression }
  | { type: 'typo'; correction: string; original: string }
  | { type: 'korean'; suggestions: Word[]; original: string }
  | { type: 'invalid'; original: string }
  | { type: 'low_value'; original: string }
  | { type: 'loading'; message: string }
  | { type: 'error'; message: string }

// Type aliases for compatibility
export type User = UserProfile
export type AccessLog = {
  id: string
  session_id: string
  user_id: string | null
  page: string
  action: string
  metadata: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}
