import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/event-logger'
import { kstDateToUTCStart, kstDateToUTCEnd } from '@/lib/date-utils'

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
  paraphrasing: string[]
}

type ExpressionRow = {
  id: string
  expression: string
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
    const sourceParam = searchParams.get('source') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const memoParam = searchParams.get('memos') || ''
    const memos = memoParam ? memoParam.split(',').filter(Boolean) : []
    const sessionId = searchParams.get('sessionId') || ''
    const quizType = searchParams.get('quizType') || 'word'
    const answerMode = searchParams.get('answerMode') === 'en2en' ? 'en2en' : 'en2ko'
    const sources = sourceParam.split(',').filter(Boolean)

    if (quizType === 'expression') {
      return handleExpressionQuiz({ user, count, sources, dateFrom, dateTo, memos, sessionId, sourceParam })
    }

    return handleWordQuiz({ user, count, sources, dateFrom, dateTo, memos, sessionId, sourceParam, answerMode })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

async function handleWordQuiz({
  user, count, sources, dateFrom, dateTo, memos, sessionId, sourceParam, answerMode,
}: {
  user: { id: string }
  count: number
  sources: string[]
  dateFrom: string
  dateTo: string
  memos: string[]
  sessionId: string
  sourceParam: string
  answerMode: 'en2ko' | 'en2en'
}) {
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

  const extractWords = (data: Record<string, unknown>[] | null) =>
    (data || [])
      .map((v) => v.word)
      .filter((w): w is WordRow => w !== null && w !== undefined)

  const withVocabFilters = (q: any) => { // eslint-disable-line
    if (dateFrom) q = q.gte('added_at', kstDateToUTCStart(dateFrom))
    if (dateTo) q = q.lte('added_at', kstDateToUTCEnd(dateTo))
    if (memos.length > 0) q = q.or(memos.map((m: string) => `memo.ilike.%${m}%`).join(','))
    return q
  }

  const runWordQuery = async (statusFilter?: 'unmemorized' | 'memorized' | 'quiz_wrong') => {
    let q = supabaseAdmin
      .from('user_vocabulary')
      .select('word:words(id, word, part_of_speech, meanings, paraphrasing)')
      .eq('user_id', user.id)
    if (statusFilter === 'unmemorized') q = q.eq('is_memorized', false)
    else if (statusFilter === 'memorized') q = q.eq('is_memorized', true)
    else if (statusFilter === 'quiz_wrong') q = q.eq('needs_review', true)
    const { data } = await withVocabFilters(q)
    addWords(extractWords(data as Record<string, unknown>[] | null))
  }

  if (sources.length === 0) {
    await runWordQuery()
  }
  if (sources.includes('unmemorized')) await runWordQuery('unmemorized')
  if (sources.includes('memorized')) await runWordQuery('memorized')
  if (sources.includes('quiz_wrong')) await runWordQuery('quiz_wrong')

  // en2en은 paraphrasing이 있는 단어만 출제 가능
  const eligibleWords = answerMode === 'en2en'
    ? collectedWords.filter(w => w.paraphrasing && w.paraphrasing.length > 0)
    : collectedWords

  if (eligibleWords.length < 4) {
    const msg = answerMode === 'en2en'
      ? '패러프레이징 퀴즈에 필요한 단어가 4개 이상 필요합니다. 조건을 넓혀 주세요.'
      : '선택한 조건에 해당하는 단어가 4개 이상 필요합니다. 조건을 넓혀 주세요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const shuffledVocab = shuffleArray(eligibleWords)
  const questionWords = shuffledVocab.slice(0, Math.min(count, shuffledVocab.length))

  // 보기 풀: 사용자 단어장 전체 제외 (출제 단어뿐 아니라 아는 단어 모두)
  const allUserVocabIds = new Set(collectedWords.map(w => w.id))

  const { data: allWords } = await supabaseAdmin
    .from('words')
    .select('id, word, part_of_speech, meanings, paraphrasing')

  const candidateWords = (allWords || []).filter(
    (w: { id: string }) => !allUserVocabIds.has(w.id)
  ) as WordRow[]

  const questions = questionWords.map((correctWord) => {
    if (answerMode === 'en2en') {
      // en→en 패러프레이징: paraphrasing[0]이 정답
      const correctParaphrase = correctWord.paraphrasing[0]

      // 오답 풀: paraphrasing 있는 후보 (같은 품사 우선)
      const candidatesWithPara = candidateWords.filter(
        w => w.paraphrasing && w.paraphrasing.length > 0
      )
      const samePOS = candidatesWithPara.filter(
        w => w.part_of_speech && w.part_of_speech === correctWord.part_of_speech
      )
      const diffPOS = candidatesWithPara.filter(
        w => w.part_of_speech !== correctWord.part_of_speech
      )

      const wrongParaphrases: string[] = []
      for (const w of shuffleArray(samePOS)) {
        if (wrongParaphrases.length >= 3) break
        wrongParaphrases.push(w.paraphrasing[0])
      }
      for (const w of shuffleArray(diffPOS)) {
        if (wrongParaphrases.length >= 3) break
        wrongParaphrases.push(w.paraphrasing[0])
      }

      const allOptions = shuffleArray([correctParaphrase, ...wrongParaphrases])
      const correctIndex = allOptions.indexOf(correctParaphrase)

      return {
        id: crypto.randomUUID(),
        wordId: correctWord.id,
        type: 'en2en' as const,
        question: correctWord.word,
        options: allOptions,
        correctIndex,
      }
    }

    // en→ko: meanings[0]이 정답 (기존 로직 + 보기 풀 수정)
    const samePOS = candidateWords.filter(
      w => w.part_of_speech && w.part_of_speech === correctWord.part_of_speech
    )
    const diffPOS = candidateWords.filter(
      w => w.part_of_speech !== correctWord.part_of_speech
    )

    const wrongAnswers: WordRow[] = []
    for (const w of shuffleArray(samePOS)) {
      if (wrongAnswers.length >= 3) break
      wrongAnswers.push(w)
    }
    for (const w of shuffleArray(diffPOS)) {
      if (wrongAnswers.length >= 3) break
      wrongAnswers.push(w)
    }

    const allOptions = [correctWord, ...wrongAnswers]
    const shuffledOptions = shuffleArray(allOptions)
    const correctIndex = shuffledOptions.findIndex(w => w.id === correctWord.id)

    return {
      id: crypto.randomUUID(),
      wordId: correctWord.id,
      type: 'en2ko' as const,
      question: correctWord.word,
      options: shuffledOptions.map(w => {
        const m = w.meanings.filter(Boolean)
        return stripPOS(m.length > 0 ? m[Math.floor(Math.random() * m.length)] : w.word)
      }),
      correctIndex,
    }
  })

  if (sessionId) {
    logEvent({
      sessionId,
      userId: user.id,
      page: '/quiz',
      action: 'quiz_start',
      metadata: {
        quizType: 'word',
        answerMode,
        count: questions.length,
        source: sourceParam,
      },
    })
  }

  return NextResponse.json({ questions, totalWords: eligibleWords.length })
}

async function handleExpressionQuiz({
  user, count, sources, dateFrom, dateTo, memos, sessionId, sourceParam,
}: {
  user: { id: string }
  count: number
  sources: string[]
  dateFrom: string
  dateTo: string
  memos: string[]
  sessionId: string
  sourceParam: string
}) {
  const collectedExprs: ExpressionRow[] = []
  const seenIds = new Set<string>()

  const addExprs = (exprs: ExpressionRow[]) => {
    for (const e of exprs) {
      if (!seenIds.has(e.id)) {
        seenIds.add(e.id)
        collectedExprs.push(e)
      }
    }
  }

  const extractExprs = (data: Record<string, unknown>[] | null) =>
    (data || [])
      .map((v) => v.expression)
      .filter((e): e is ExpressionRow => e !== null && e !== undefined)

  const withExprFilters = (q: any) => { // eslint-disable-line
    if (dateFrom) q = q.gte('added_at', kstDateToUTCStart(dateFrom))
    if (dateTo) q = q.lte('added_at', kstDateToUTCEnd(dateTo))
    if (memos.length > 0) q = q.or(memos.map((m: string) => `memo.ilike.%${m}%`).join(','))
    return q
  }

  const runExprQuery = async (statusFilter?: 'unmemorized' | 'memorized' | 'quiz_wrong') => {
    let q = supabaseAdmin
      .from('user_expressions')
      .select('expression:expressions(id, expression, meanings)')
      .eq('user_id', user.id)
    if (statusFilter === 'unmemorized') q = q.eq('is_memorized', false)
    else if (statusFilter === 'memorized') q = q.eq('is_memorized', true)
    else if (statusFilter === 'quiz_wrong') q = q.eq('needs_review', true)
    const { data } = await withExprFilters(q)
    addExprs(extractExprs(data as Record<string, unknown>[] | null))
  }

  if (sources.length === 0) {
    await runExprQuery()
  }
  if (sources.includes('unmemorized')) await runExprQuery('unmemorized')
  if (sources.includes('memorized')) await runExprQuery('memorized')
  if (sources.includes('quiz_wrong')) await runExprQuery('quiz_wrong')

  if (collectedExprs.length < 4) {
    return NextResponse.json(
      { error: '선택한 조건에 해당하는 청해 구문이 4개 이상 필요합니다. 조건을 넓혀 주세요.' },
      { status: 400 }
    )
  }

  const shuffledExprs = shuffleArray(collectedExprs)
  const questionExprs = shuffledExprs.slice(0, Math.min(count, shuffledExprs.length))

  // 보기 풀: 사용자 Lenz픽 전체 제외
  const allUserExprIds = new Set(collectedExprs.map(e => e.id))

  const { data: allExprs } = await supabaseAdmin
    .from('expressions')
    .select('id, expression, meanings')

  const candidateExprs = (allExprs || []).filter(
    (e: { id: string }) => !allUserExprIds.has(e.id)
  ) as ExpressionRow[]

  const questions = questionExprs.map((correctExpr) => {
    const wrongAnswers = shuffleArray(candidateExprs).slice(0, 3)

    const allOptions = [correctExpr, ...wrongAnswers]
    const shuffledOptions = shuffleArray(allOptions)
    const correctIndex = shuffledOptions.findIndex(e => e.id === correctExpr.id)

    return {
      id: crypto.randomUUID(),
      wordId: correctExpr.id,
      type: 'en2ko' as const,
      question: correctExpr.expression,
      options: shuffledOptions.map(e => stripPOS(e.meanings[0] || e.expression)),
      correctIndex,
    }
  })

  if (sessionId) {
    logEvent({
      sessionId,
      userId: user.id,
      page: '/quiz',
      action: 'quiz_start',
      metadata: {
        quizType: 'expression',
        count: questions.length,
        source: sourceParam,
      },
    })
  }

  return NextResponse.json({ questions, totalWords: collectedExprs.length })
}
