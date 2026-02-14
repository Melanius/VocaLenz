import { openai } from './openai'
import type { GatekeeperResponse, GatekeeperStatus } from '@/types/database'

const GATEKEEPER_SYSTEM_PROMPT = `당신은 영어 학습 앱의 입력 판별 시스템입니다.
사용자가 입력한 텍스트를 분석하여 아래 JSON 형식으로만 응답하세요.

판별 기준:
- VALID: 영어 단어 또는 숙어(phrasal verb, idiom)로 인정되며, TEPS 시험 학습에 가치가 있는 경우
- TYPO: 영어 단어 같지만 철자가 틀린 경우 (correction에 올바른 단어 제시)
- KOREAN: 한국어 입력인 경우
- INVALID: 단어/숙어로 볼 수 없는 입력 (문장, 무의미한 문자열, 숫자 등)
- LOW_VALUE: 고유명사(Samsung, Tom), 관사(the, a), 대명사(I, you), 전치사(in, on) 등 TEPS 어휘 학습 가치가 낮은 단어

응답 형식 (JSON만):
{
  "status": "VALID" | "TYPO" | "KOREAN" | "INVALID" | "LOW_VALUE",
  "correction": "수정 추천 단어 (TYPO일 때만)",
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
        // 최종 실패 시 안전한 기본값 반환
        return {
          status: 'INVALID',
          reason: 'AI 응답 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
        }
      }
      // 재시도 전 짧은 대기
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  // 이론상 도달 불가
  return {
    status: 'INVALID',
    reason: 'AI 응답 처리 중 오류가 발생했습니다.',
  }
}

function isValidGatekeeperStatus(status: string): status is GatekeeperStatus {
  return ['VALID', 'TYPO', 'KOREAN', 'INVALID', 'LOW_VALUE'].includes(status)
}
