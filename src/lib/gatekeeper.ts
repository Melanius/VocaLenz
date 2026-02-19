import { openai } from './openai'
import type { GatekeeperResponse, GatekeeperStatus } from '@/types/database'

const GATEKEEPER_SYSTEM_PROMPT = `당신은 영어 학습 앱의 입력 판별 시스템입니다.
사용자가 입력한 텍스트를 분석하여 아래 JSON 형식으로만 응답하세요.

판별 기준:
- WORD: 단일 영어 단어 또는 복합명사 (예: amity, deadline, ice cream). TEPS 시험 학습에 가치 있는 단어
- PHRASE: 숙어, 구동사, 관용구, 구어체 표현 (예: take after, you bet, by all means, call it a day). TEPS 청해/어휘 학습에 가치 있는 표현
- TYPO: 영어 단어/표현 같지만 철자가 틀린 경우 (correction에 올바른 단어/표현 제시)
- KOREAN: 한국어 입력인 경우
- INVALID: 단어/숙어로 볼 수 없는 입력 (긴 문장, 무의미한 문자열, 숫자 등)
- LOW_VALUE: 고유명사(Samsung, Tom), 관사(the, a), 대명사(I, you), 전치사(in, on) 등 TEPS 어휘 학습 가치가 낮은 단어

WORD vs PHRASE 구분 핵심:
- 띄어쓰기가 있어도 하나의 의미 단위로 쓰이는 복합명사(ice cream, hot dog)는 WORD
- 동사+전치사/부사 형태의 구동사(take off, run into)는 PHRASE
- 관용 표현(you bet, no way, by all means)은 PHRASE
- 판단이 애매하면 단어 사전에 독립 표제어로 등재되는지 기준으로 판별

PHRASE 판별 시 canonical_form 규칙:
- 입력이 문장이든 활용형이든, 핵심 숙어/구동사/관용구만 추출하여 canonical_form에 제시
- canonical_form은 사전 표제어 형태 (원형 동사 + 전치사/부사)
- 예: "I got rid of it" → canonical_form: "get rid of"
- 예: "she backed out of the deal" → canonical_form: "back out of"
- 예: "taking after his father" → canonical_form: "take after"
- 예: "get rid of" → canonical_form: "get rid of" (이미 원형이면 그대로)

응답 형식 (JSON만):
{
  "status": "WORD" | "PHRASE" | "TYPO" | "KOREAN" | "INVALID" | "LOW_VALUE",
  "canonical_form": "핵심 표현 원형 (PHRASE일 때만)",
  "correction": "수정 추천 (TYPO일 때만)",
  "suggestions": [] (KOREAN일 때 빈 배열),
  "reason": "판별 사유 (한국어로)"
}`

export async function evaluateWithGatekeeper(
  input: string
): Promise<GatekeeperResponse> {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: GATEKEEPER_SYSTEM_PROMPT },
          { role: 'user', content: `입력: "${input}"` },
        ],
        temperature: 0.1,
        max_tokens: 200,
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      const parsed = JSON.parse(content) as GatekeeperResponse

      // 유효성 검증
      if (!isValidGatekeeperStatus(parsed.status)) {
        throw new Error(`Invalid status: ${parsed.status}`)
      }

      return parsed
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error('Gatekeeper failed after retries:', error)
        return {
          status: 'INVALID',
          reason: 'AI 응답 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
        }
      }
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  return {
    status: 'INVALID',
    reason: 'AI 응답 처리 중 오류가 발생했습니다.',
  }
}

function isValidGatekeeperStatus(status: string): status is GatekeeperStatus {
  return ['WORD', 'PHRASE', 'TYPO', 'KOREAN', 'INVALID', 'LOW_VALUE'].includes(status)
}
