import { openai } from './openai'
import type { ExpressionGenerationResponse } from '@/types/database'

const EXPRESSION_GENERATOR_SYSTEM_PROMPT = `당신은 TEPS 청해 시험 전문 영어 교사입니다.
주어진 영어 표현(숙어, 구동사, 관용구, 구어체 표현)에 대해 TEPS 청해 학습에 최적화된 정보를 아래 JSON 형식으로만 제공하세요.

중요 규칙:
1. meanings는 직역이 아닌 의역(대화 뉘앙스) 중심으로 최대 3개
2. description은 격식/비격식 여부, 사용 빈도, 뉘앙스를 포함한 설명
3. example_sentence는 반드시 A/B 대화(Dialogue) 형식으로 작성
4. context는 이 표현이 쓰이는 구체적인 대화 상황을 설명
5. pronunciation_tip은 실제 원어민 발음 시 연음, 강세, 축약 패턴을 한글 표기와 함께 설명
6. listening_parts는 TEPS 청해 파트 1~5 중 이 표현이 자주 출제되는 파트를 명시
7. comparisons는 혼동하기 쉬운 유사 표현과의 차이점을 설명
8. paraphrasing은 같은 뜻을 다르게 표현한 것 (시험에서 바꿔 말하기로 출제되는 형태)
9. teps_point는 TEPS 청해에서의 출제 경향, 오답 보기 패턴, 주의점
10. 각 텍스트 필드는 최대 500자 이내

응답 형식 (JSON만):
{
  "expression": "표현",
  "meanings": ["의역 뜻1", "뜻2"],
  "description": "뉘앙스 설명 (격식/비격식, 사용 상황 포함)",
  "teps_point": "TEPS 청해 출제 포인트 (한국어)",
  "context": "이 표현이 쓰이는 대화 상황 (예: 상대방의 의견에 강하게 동의할 때)",
  "pronunciation_tip": "연음/강세 팁 (예: you bet → [유벳], 빠르게 발음될 때 [유벧]으로 들림)",
  "listening_parts": ["Part 1", "Part 2"],
  "paraphrasing": ["같은 뜻의 다른 표현1", "표현2"],
  "comparisons": ["유사 표현 - 차이점 설명"],
  "example_sentence": "A: 대화문\\nB: 응답문 (TEPS 청해 스타일)",
  "example_translation": "A: 해석\\nB: 해석",
  "difficulty_level": 1~4 (1: Essential, 2: Core, 3: Advanced, 4: Killer)
}`

export async function generateExpressionData(
  expression: string
): Promise<ExpressionGenerationResponse> {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXPRESSION_GENERATOR_SYSTEM_PROMPT },
          { role: 'user', content: `표현: "${expression}"` },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      const parsed = JSON.parse(content) as ExpressionGenerationResponse

      if (!parsed.expression || !parsed.description) {
        throw new Error('Missing required fields in response')
      }

      return {
        ...parsed,
        meanings: parsed.meanings || [],
        listening_parts: parsed.listening_parts || [],
        paraphrasing: parsed.paraphrasing || [],
        comparisons: parsed.comparisons || [],
        difficulty_level: parsed.difficulty_level || 2,
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error('Expression generation failed after retries:', error)
        throw new Error('AI 표현 생성에 실패했습니다.')
      }
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  throw new Error('AI 표현 생성에 실패했습니다.')
}
