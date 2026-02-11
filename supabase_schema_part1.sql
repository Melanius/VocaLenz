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
