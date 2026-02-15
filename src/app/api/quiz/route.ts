import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function stripPOS(meaning: string): string {
  return meaning.replace(/^\([^)]+\)\s*/, '')
}

type WordRow = {
  id: string
  word: string
  part_of_speech: string | null
  meanings: string[]
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const count = Math.min(parseInt(searchParams.get('count') || '10', 10), 20)
    const sourceParam = searchParams.get('source') || 'unmemorized'
    const historyDate = searchParams.get('historyDate') || ''
    const historyDateTo = searchParams.get('historyDateTo') || ''
    const sources = sourceParam.split(',').filter(Boolean)

    // 1. 소스별 단어 수집
    const collectedWords: WordRow[] = []
    const seenIds = new Set<string>()

    const addWords = (words: WordRow[]) => {
      for (const w of words) {
        if (!seenIds.has(w.id)) {
          seenIds.add(w.id)
          collectedWords.push(w)
        }
      }
    }

    if (sources.includes('unmemorized')) {
      const { data } = await supabaseAdmin
        .from('user_vocabulary')
        .select('word:words(id, word, part_of_speech, meanings)')
        .eq('user_id', user.id)
        .eq('is_memorized', false)

      const words = (data || [])
        .map((v: Record<string, unknown>) => v.word)
        .filter((w): w is WordRow => w !== null && w !== undefined)
      addWords(words)
    }

    if (sources.includes('memorized')) {
      const { data } = await supabaseAdmin
        .from('user_vocabulary')
        .select('word:words(id, word, part_of_speech, meanings)')
        .eq('user_id', user.id)
        .eq('is_memorized', true)

      const words = (data || [])
        .map((v: Record<string, unknown>) => v.word)
        .filter((w): w is WordRow => w !== null && w !== undefined)
      addWords(words)
    }

    if (sources.includes('history') && historyDate) {
      let query = supabaseAdmin
        .from('user_word_history')
        .select('word:words(id, word, part_of_speech, meanings)')
        .eq('user_id', user.id)
        .gte('searched_at', historyDate)

      if (historyDateTo) {
        // 종료일의 다음 날 자정까지 포함
        query = query.lt('searched_at', historyDateTo + 'T23:59:59.999Z')
      }

      const { data } = await query

      const words = (data || [])
        .map((v: Record<string, unknown>) => v.word)
        .filter((w): w is WordRow => w !== null && w !== undefined)
      addWords(words)
    }

    // 2. 단어 4개 미만 체크
    if (collectedWords.length < 4) {
      return NextResponse.json(
        { error: '선택한 범위에 단어가 4개 이상 필요합니다. 범위를 넓혀 주세요.' },
        { status: 400 }
      )
    }

    // 3. 랜덤 선택 (정답 단어)
    const shuffledVocab = shuffleArray(collectedWords)
    const questionWords = shuffledVocab.slice(0, Math.min(count, shuffledVocab.length))

    // 4. 오답 후보 전체 조회 (words 테이블에서)
    const questionWordIds = questionWords.map((w) => w.id)
    const { data: allWords } = await supabaseAdmin
      .from('words')
      .select('id, word, part_of_speech, meanings')

    const candidateWords = (allWords || []).filter(
      (w: { id: string }) => !questionWordIds.includes(w.id)
    ) as WordRow[]

    // 5. 문제 생성 (en2ko 고정)
    const questions = questionWords.map((correctWord) => {
      const samePOS = candidateWords.filter(
        (w) => w.part_of_speech && w.part_of_speech === correctWord.part_of_speech && w.id !== correctWord.id
      )
      const diffPOS = candidateWords.filter(
        (w) => w.part_of_speech !== correctWord.part_of_speech && w.id !== correctWord.id
      )

      const shuffledSame = shuffleArray(samePOS)
      const shuffledDiff = shuffleArray(diffPOS)

      const wrongAnswers: WordRow[] = []
      for (const w of shuffledSame) {
        if (wrongAnswers.length >= 3) break
        wrongAnswers.push(w)
      }
      for (const w of shuffledDiff) {
        if (wrongAnswers.length >= 3) break
        wrongAnswers.push(w)
      }

      const allOptions = [correctWord, ...wrongAnswers]
      const shuffledOptions = shuffleArray(allOptions)
      const correctIndex = shuffledOptions.findIndex((w) => w.id === correctWord.id)

      const question = correctWord.word
      const options = shuffledOptions.map((w) => stripPOS(w.meanings[0] || w.word))

      return {
        id: crypto.randomUUID(),
        wordId: correctWord.id,
        type: 'en2ko' as const,
        question,
        options,
        correctIndex,
      }
    })

    return NextResponse.json({
      questions,
      totalWords: collectedWords.length,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
