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

// "(형용사) 공정한" → "형용사" | "공정한" → null
function extractMeaningPOS(meaning: string): string | null {
  const match = meaning.match(/^\(([^)]+)\)/)
  return match ? match[1].trim() : null
}

// "adj./n." → "adj" | "v." → "v" | null → ""
function extractPrimaryPOS(pos: string | null): string {
  if (!pos) return ''
  return pos.split('/')[0].trim().replace(/\.$/, '').toLowerCase()
}

// meanings 배열에서 quizPOS에 맞는 뜻 중 랜덤 선택 (없으면 전체 중 랜덤)
function pickMeaning(meanings: string[], quizPOS: string | null): string {
  const valid = meanings.filter(Boolean)
  if (valid.length === 0) return ''
  if (!quizPOS) return valid[Math.floor(Math.random() * valid.length)]
  const matched = valid.filter(m => extractMeaningPOS(m) === quizPOS)
  const pool = matched.length > 0 ? matched : valid
  return pool[Math.floor(Math.random() * pool.length)]
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

  // 보기 풀: 이번 퀴즈 출제 단어만 제외 (사용자 단어장 전체 포함 가능)
  const questionWordIds = new Set(questionWords.map(w => w.id))

  const { data: allWords } = await supabaseAdmin
    .from('words')
    .select('id, word, part_of_speech, meanings, paraphrasing')

  const candidateWords = (allWords || []).filter(
    (w: { id: string }) => !questionWordIds.has(w.id)
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

    // ─────────────────────────────────────────────────────────────────
    // en→ko: POS 일관성 보장 (방향 C)
    // ─────────────────────────────────────────────────────────────────

    // 1. 정답 뜻 선택 + quiz POS 확정
    const validMeanings = correctWord.meanings.filter(Boolean)
    const chosenMeaning = validMeanings.length > 0
      ? validMeanings[Math.floor(Math.random() * validMeanings.length)]
      : correctWord.word
    const quizPOS = extractMeaningPOS(chosenMeaning) // e.g. "형용사" | null
    const correctOptionText = stripPOS(chosenMeaning)

    // 2. 오답 후보 분류 (primary POS 기준 느슨한 매칭)
    const correctPrimaryPOS = extractPrimaryPOS(correctWord.part_of_speech)

    // tier1: 같은 primary POS + quizPOS 태그 뜻 보유
    const tier1 = candidateWords.filter(w =>
      extractPrimaryPOS(w.part_of_speech) === correctPrimaryPOS &&
      correctPrimaryPOS !== '' &&
      (quizPOS === null || w.meanings.some(m => extractMeaningPOS(m) === quizPOS))
    )
    // tier2: 같은 primary POS (quizPOS 태그 뜻 없음)
    const tier2 = candidateWords.filter(w =>
      extractPrimaryPOS(w.part_of_speech) === correctPrimaryPOS &&
      correctPrimaryPOS !== '' &&
      quizPOS !== null &&
      !w.meanings.some(m => extractMeaningPOS(m) === quizPOS)
    )
    // tier3: 다른 POS (최후 폴백)
    const tier3 = candidateWords.filter(w =>
      extractPrimaryPOS(w.part_of_speech) !== correctPrimaryPOS ||
      correctPrimaryPOS === ''
    )

    // 3. 오답 3개 선택 (중복 방지)
    const usedTexts = new Set<string>([correctOptionText])
    const wrongOptions: string[] = []

    const tryAdd = (w: WordRow, pos: string | null) => {
      if (wrongOptions.length >= 3) return
      const text = stripPOS(pickMeaning(w.meanings, pos))
      if (text && !usedTexts.has(text)) {
        wrongOptions.push(text)
        usedTexts.add(text)
      }
    }

    for (const w of shuffleArray(tier1)) {
      if (wrongOptions.length >= 3) break
      tryAdd(w, quizPOS)
    }
    for (const w of shuffleArray(tier2)) {
      if (wrongOptions.length >= 3) break
      tryAdd(w, null) // quizPOS 태그 뜻 없으니 제약 없이
    }
    for (const w of shuffleArray(tier3)) {
      if (wrongOptions.length >= 3) break
      tryAdd(w, null)
    }

    // 4. 셔플 후 정답 인덱스 확정
    type OptionEntry = { text: string; isCorrect: boolean }
    const rawEntries: OptionEntry[] = [
      { text: correctOptionText, isCorrect: true },
      ...wrongOptions.map(t => ({ text: t, isCorrect: false })),
    ]
    const shuffledEntries = shuffleArray(rawEntries)

    return {
      id: crypto.randomUUID(),
      wordId: correctWord.id,
      type: 'en2ko' as const,
      question: correctWord.word,
      options: shuffledEntries.map(e => e.text),
      correctIndex: shuffledEntries.findIndex(e => e.isCorrect),
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
