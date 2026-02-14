import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { openai } from '@/lib/openai'

// 일회용 배치 재분류 API — 사용 후 삭제할 것
// GET /api/words/reclassify

const BATCH_SIZE = 20

const CLASSIFY_PROMPT = `당신은 TEPS 시험 어휘 전문가입니다.
주어진 영어 단어 목록의 TEPS 목표 점수 기반 난이도를 JSON으로만 응답하세요.

분류 기준:
1: Essential (327점↓) - 기초 학술어휘, 일상 빈출어. 모르면 점수가 안 나오는 기본기.
2: Core (450점 목표) - 중급 학술/비즈니스 어휘. 청해/독해 핵심 키워드.
3: Advanced (550점+) - 전문 분야(과학, 철학, 예술), 까다로운 구동사. 고득점 변별.
4: Killer (만점 도전) - 매우 희귀하거나 문맥적 의미가 까다로운 어휘. 600점 달성용.

응답 형식 (JSON만):
{"results": [{"word": "단어", "level": 숫자}]}`

export async function GET() {
  try {
    // 모든 단어 조회
    const { data: words, error } = await supabaseAdmin
      .from('words')
      .select('id, word, difficulty_level')
      .order('word')

    if (error || !words) {
      return NextResponse.json({ error: 'DB 조회 실패', details: error }, { status: 500 })
    }

    if (words.length === 0) {
      return NextResponse.json({ message: '재분류할 단어가 없습니다.', total: 0 })
    }

    const results: { word: string; oldLevel: number; newLevel: number }[] = []
    let updated = 0

    // BATCH_SIZE개씩 GPT 호출
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE)
      const wordList = batch.map((w) => w.word).join(', ')

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: CLASSIFY_PROMPT },
            { role: 'user', content: `단어 목록: ${wordList}` },
          ],
          temperature: 0.1,
          max_tokens: 500,
        })

        const content = response.choices[0].message.content
        if (!content) continue

        const parsed = JSON.parse(content) as {
          results: { word: string; level: number }[]
        }

        // DB 업데이트
        for (const item of parsed.results) {
          const dbWord = batch.find(
            (w) => w.word.toLowerCase() === item.word.toLowerCase()
          )
          if (!dbWord) continue

          const newLevel = Math.min(4, Math.max(1, item.level))

          if (dbWord.difficulty_level !== newLevel) {
            await supabaseAdmin
              .from('words')
              .update({ difficulty_level: newLevel })
              .eq('id', dbWord.id)

            updated++
          }

          results.push({
            word: dbWord.word,
            oldLevel: dbWord.difficulty_level,
            newLevel,
          })
        }
      } catch (batchError) {
        console.error(`Batch ${i} failed:`, batchError)
        // 실패한 배치는 건너뛰고 계속 진행
      }
    }

    return NextResponse.json({
      message: `재분류 완료`,
      total: words.length,
      updated,
      results,
    })
  } catch (error) {
    console.error('Reclassify error:', error)
    return NextResponse.json(
      { error: '재분류 중 오류 발생' },
      { status: 500 }
    )
  }
}
