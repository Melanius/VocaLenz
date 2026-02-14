import { openai } from './openai'
import type { WordGenerationResponse } from '@/types/database'

const WORD_GENERATOR_SYSTEM_PROMPT = `당신은 TEPS 시험 전문 영어 어휘 교사입니다.
주어진 영어 단어/숙어에 대해 TEPS 시험 학습에 최적화된 정보를 아래 JSON 형식으로만 제공하세요.

중요 규칙:
1. 다의어의 경우 TEPS에서 가장 빈출되는 의미 위주로 설명. 여러 품사로 쓰이는 단어는 각 품사별 주요 뜻을 모두 포함
2. 초등/중학 수준의 기본 뜻은 제외하고 시험에 출제되는 고급 의미 우선
3. 이미지 연상 텍스트는 해당 단어를 연상할 수 있는 이모지 1개로 시작하고, 그림이 아닌 머릿속에 장면이 떠오르는 묘사문으로 작성 (예: "🔥 불길이 치솟는 건물에서...")
4. 예문은 TEPS 시험 스타일로 작성
5. 각 텍스트 필드는 최대 500자 이내로 작성할 것
6. paraphrasing은 해당 시험에서 실제 출제 시 바꿔 쓰기(paraphrasing)로 자주 등장하는 표현을 제시할 것 (단순 유사어가 아닌, 시험 문맥에서 치환 가능한 표현)
7. description은 한국어로 단어의 순수한 뜻과 용법만 설명할 것 (TEPS 출제 경향, 시험 포인트 등은 teps_point에서 다루므로 description에는 포함하지 않기). 여러 품사로 쓰이면 "명사로는 ~, 동사로는 ~" 형태로 품사별 용법을 구분하여 설명. description_en도 동일하게 품사별 영어 설명
8. meanings는 단답형 뜻 목록으로, 최대 5개까지, TEPS 빈출 순으로 제시. 여러 품사로 쓰이는 단어는 각 품사별 주요 뜻을 포함하되 합계 5개 이내. 각 항목에 품사 포함 (예: "(명) 배신", "(동) 배반하다")
9. part_of_speech는 해당 단어가 여러 품사로 쓰이면 슬래시(/)로 구분하여 모두 명시 (예: "명사/동사", "형용사/부사"). 숙어는 단독 "숙어"로 표기

응답 형식 (JSON만):
{
  "word": "단어",
  "part_of_speech": "품사 (여러 품사면 슬래시 구분: 명사/동사)",
  "pronunciation": "발음기호",
  "meanings": ["(명) 간결한 뜻1", "(동) 뜻2", "(명) 뜻3"],
  "image_text": "🎯 이모지로 시작하는 이미지 연상 텍스트 (한국어, 2~3문장)",
  "description": "문장형 상세 뜻 (한국어, 순수 뜻/용법만, TEPS 관련 내용 제외)",
  "description_en": "Detailed definition in English (TEPS-oriented, academic register)",
  "teps_point": "TEPS 포인트 (한국어, 출제 경향/주의점)",
  "synonyms": ["유사어1", "유사어2", "유사어3"],
  "antonyms": ["반의어1", "반의어2"],
  "comparisons": ["비교어1 - 차이점 설명"],
  "paraphrasing": ["paraphrasing 표현1", "paraphrasing 표현2"],
  "example_sentence": "TEPS 스타일 영어 예문",
  "example_translation": "예문 한국어 해석",
  "difficulty_level": 1~4 (1: Essential 327점↓ 기초필수, 2: Core 450점 목표 중급학술, 3: Advanced 550점+ 고득점, 4: Killer 만점 변별력 희귀어)
}`

export async function generateWordData(
  word: string
): Promise<WordGenerationResponse> {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: WORD_GENERATOR_SYSTEM_PROMPT },
          { role: 'user', content: `단어: "${word}"` },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      const parsed = JSON.parse(content) as WordGenerationResponse

      // 필수 필드 검증
      if (!parsed.word || !parsed.description) {
        throw new Error('Missing required fields in response')
      }

      // 배열 필드 기본값 처리
      return {
        ...parsed,
        meanings: parsed.meanings || [],
        synonyms: parsed.synonyms || [],
        antonyms: parsed.antonyms || [],
        comparisons: parsed.comparisons || [],
        paraphrasing: parsed.paraphrasing || [],
        difficulty_level: parsed.difficulty_level || 2,
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error('Word generation failed after retries:', error)
        throw new Error('AI 단어 생성에 실패했습니다.')
      }
      // 재시도 전 짧은 대기
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  throw new Error('AI 단어 생성에 실패했습니다.')
}
