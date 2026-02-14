-- v1.8: meanings 컬럼 추가 (단답형 뜻, 최대 3개)
ALTER TABLE words ADD COLUMN IF NOT EXISTS meanings text[] DEFAULT '{}';

-- 한국어 검색을 위한 RPC 함수
CREATE OR REPLACE FUNCTION search_by_meaning(search_term text)
RETURNS SETOF words
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM words
  WHERE EXISTS (
    SELECT 1 FROM unnest(meanings) m WHERE m LIKE '%' || search_term || '%'
  )
  LIMIT 5;
$$;
