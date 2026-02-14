import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { openai } from '@/lib/openai'

// 일회용 배치 품사 재확인 API
// GET /api/words/recheck-pos

const BATCH_SIZE = 10

const POS_CHECK_PROMPT = `당신은 TEPS 시험 전문 영어 어휘 교사입니다.
주어진 영어 단어 목록 각각에 대해 품사와 TEPS 빈출 뜻을 확인하세요.

규칙:
1. 여러 품사로 쓰이는 단어는 part_of_speech에 슬래시(/)로 구분하여 모두 명시 (예: "명사/동사", "형용사/부사")
2. 숙어는 단독 "숙어"로 표기
3. meanings는 최대 5개, 각 항목에 품사 포함 (예: "(명) 배신", "(동) 배반하다")
4. 여러 품사로 쓰이면 각 품사별 주요 뜻을 포함
5. TEPS 빈출 순으로 제시, 초등/중학 수준 기본 뜻 제외

응답 형식 (JSON만):
{"results": [{"word": "단어", "part_of_speech": "명사/동사", "meanings": ["(명) 뜻1", "(동) 뜻2"]}]}`

export async function GET() {
  try {
    const { data: words, error } = await supabaseAdmin
      .from('words')
      .select('id, word, part_of_speech, meanings')
      .order('word')

    if (error || !words) {
      return NextResponse.json({ error: 'DB 조회 실패', details: error }, { status: 500 })
    }

    if (words.length === 0) {
      return NextResponse.json({ message: '재확인할 단어가 없습니다.', total: 0 })
    }

    const results: {
      word: string
      oldPos: string | null
      newPos: string
      oldMeanings: string[]
      newMeanings: string[]
    }[] = []
    let updated = 0

    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE)
      const wordList = batch.map((w) => w.word).join(', ')

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: POS_CHECK_PROMPT },
            { role: 'user', content: `단어 목록: ${wordList}` },
          ],
          temperature: 0.1,
          max_tokens: 1500,
        })

        const content = response.choices[0].message.content
        if (!content) continue

        const parsed = JSON.parse(content) as {
          results: { word: string; part_of_speech: string; meanings: string[] }[]
        }

        for (const item of parsed.results) {
          const dbWord = batch.find(
            (w) => w.word.toLowerCase() === item.word.toLowerCase()
          )
          if (!dbWord) continue

          const posChanged = dbWord.part_of_speech !== item.part_of_speech
          const meaningsChanged =
            JSON.stringify(dbWord.meanings) !== JSON.stringify(item.meanings)

          if (posChanged || meaningsChanged) {
            await supabaseAdmin
              .from('words')
              .update({
                part_of_speech: item.part_of_speech,
                meanings: item.meanings,
              })
              .eq('id', dbWord.id)

            updated++
          }

          results.push({
            word: dbWord.word,
            oldPos: dbWord.part_of_speech,
            newPos: item.part_of_speech,
            oldMeanings: dbWord.meanings || [],
            newMeanings: item.meanings,
          })
        }
      } catch (batchError) {
        console.error(`Batch ${i} failed:`, batchError)
      }
    }

    return NextResponse.json({
      message: '품사 재확인 완료',
      total: words.length,
      updated,
      results,
    })
  } catch (error) {
    console.error('POS recheck error:', error)
    return NextResponse.json(
      { error: '품사 재확인 중 오류 발생' },
      { status: 500 }
    )
  }
}
