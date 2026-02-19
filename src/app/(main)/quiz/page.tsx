'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Brain, Loader2, RotateCcw, BookOpen, Trophy, XCircle, CheckCircle2, Shuffle, RefreshCw, Headphones } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/components/providers/auth-provider'
import { toast } from '@/hooks/use-toast'
import { getSessionId } from '@/lib/session'

type QuizType = 'word' | 'expression'
type QuizState = 'idle' | 'loading' | 'playing' | 'result'

interface QuizQuestionData {
  id: string
  wordId: string
  type: 'en2ko'
  question: string
  options: string[]
  correctIndex: number
}

interface AnswerRecord {
  question: QuizQuestionData
  selectedIndex: number
  isCorrect: boolean
  timeMs: number
}

export default function QuizPage() {
  const { user, loading: authLoading } = useAuthContext()
  const [quizType, setQuizType] = useState<QuizType>('word')
  const [state, setState] = useState<QuizState>('idle')
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [totalWords, setTotalWords] = useState<number>(0)
  const [questions, setQuestions] = useState<QuizQuestionData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const questionStartTime = useRef<number>(Date.now())

  // 퀴즈 범위 체크박스
  const [sourceUnmemorized, setSourceUnmemorized] = useState(true)
  const [sourceMemorized, setSourceMemorized] = useState(false)
  const [sourceHistory, setSourceHistory] = useState(false)
  const [historyDateMode, setHistoryDateMode] = useState<'single' | 'range'>('single')
  const [historyDate, setHistoryDate] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')

  // 복습 표시 처리 상태
  const [reviewMarked, setReviewMarked] = useState<Set<string>>(new Set())

  const buildSourceParam = () => {
    const sources: string[] = []
    if (sourceUnmemorized) sources.push('unmemorized')
    if (sourceMemorized) sources.push('memorized')
    if (sourceHistory) sources.push('history')
    return sources.join(',')
  }

  const fetchQuiz = useCallback(async () => {
    const source = buildSourceParam()
    if (!source) {
      toast({ title: '범위 선택 필요', description: '최소 하나의 범위를 선택해 주세요.', variant: 'destructive' })
      return
    }

    setState('loading')
    try {
      const sid = getSessionId()
      let url = `/api/quiz?count=${questionCount}&source=${source}&sessionId=${sid}&quizType=${quizType}`
      if (sourceHistory && historyDate) {
        url += `&historyDate=${historyDate}`
        if (historyDateMode === 'range' && historyDateTo) {
          url += `&historyDateTo=${historyDateTo}`
        }
      }
      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok) {
        toast({ title: '퀴즈 생성 실패', description: data.error, variant: 'destructive' })
        setState('idle')
        return
      }

      setQuestions(data.questions)
      setTotalWords(data.totalWords)
      setCurrentIndex(0)
      setAnswers([])
      setSelectedIndex(null)
      setShowFeedback(false)
      setReviewMarked(new Set())
      questionStartTime.current = Date.now()
      setState('playing')
    } catch {
      toast({ title: '오류', description: '퀴즈를 불러올 수 없습니다.', variant: 'destructive' })
      setState('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizType, questionCount, sourceUnmemorized, sourceMemorized, sourceHistory, historyDate, historyDateMode, historyDateTo])

  const handleAnswer = (index: number) => {
    if (showFeedback || selectedIndex !== null) return

    const current = questions[currentIndex]
    const isCorrect = index === current.correctIndex
    const timeMs = Date.now() - questionStartTime.current
    setSelectedIndex(index)
    setShowFeedback(true)

    const record: AnswerRecord = { question: current, selectedIndex: index, isCorrect, timeMs }
    const newAnswers = [...answers, record]
    setAnswers(newAnswers)

    const delay = isCorrect ? 1000 : 1500
    timerRef.current = setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1)
        setSelectedIndex(null)
        setShowFeedback(false)
        questionStartTime.current = Date.now()
      } else {
        sendQuizComplete(newAnswers)
        setState('result')
      }
    }, delay)
  }

  const sendQuizComplete = async (finalAnswers: AnswerRecord[]) => {
    try {
      const correctCount = finalAnswers.filter((a) => a.isCorrect).length
      const totalTime = finalAnswers.reduce((sum, a) => sum + a.timeMs, 0)
      await fetch('/api/quiz/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getSessionId(),
          answers: finalAnswers.map((a) => ({
            word: a.question.question,
            correct: a.isCorrect,
            timeMs: a.timeMs,
          })),
          total: finalAnswers.length,
          correct: correctCount,
          score: Math.round((correctCount / finalAnswers.length) * 100),
          avgTimeMs: Math.round(totalTime / finalAnswers.length),
        }),
      })
    } catch {
      // fire-and-forget
    }
  }

  const resetQuiz = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setState('idle')
    setQuestions([])
    setCurrentIndex(0)
    setAnswers([])
    setSelectedIndex(null)
    setShowFeedback(false)
    setReviewMarked(new Set())
  }

  const markForReview = async (wordId: string) => {
    try {
      const res = await fetch(`/api/vocabulary/review?wordId=${wordId}`, {
        method: 'PATCH',
      })
      if (res.ok) {
        setReviewMarked((prev) => new Set(prev).add(wordId))
        toast({ title: '복습 표시 완료', description: '단어장에서 복습 필요 표시가 되었습니다.' })
      }
    } catch {
      toast({ title: '오류', description: '복습 표시에 실패했습니다.', variant: 'destructive' })
    }
  }

  const markAllForReview = async (wrongAnswers: AnswerRecord[]) => {
    for (const a of wrongAnswers) {
      if (!reviewMarked.has(a.question.wordId)) {
        try {
          const res = await fetch(`/api/vocabulary/review?wordId=${a.question.wordId}`, {
            method: 'PATCH',
          })
          if (res.ok) {
            setReviewMarked((prev) => new Set(prev).add(a.question.wordId))
          }
        } catch {
          // continue with others
        }
      }
    }
    toast({ title: '복습 표시 완료', description: '틀린 항목 모두 복습 표시되었습니다.' })
  }

  // --- 인증 로딩 ---
  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  // --- 로그인 가드 ---
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">퀴즈로 실력을 점검해 보세요</h2>
          <p className="text-muted-foreground">
            로그인하면 내 단어장을 기반으로<br />
            4지선다 퀴즈를 풀 수 있어요.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>영어 → 한국어 퀴즈</li>
            <li>같은 품사 오답으로 실전 감각 UP</li>
            <li>틀린 항목 즉시 확인 가능</li>
          </ul>
          <Button asChild>
            <Link href="/auth/login">로그인하고 시작하기</Link>
          </Button>
        </div>
      </div>
    )
  }

  // --- 퀴즈 로딩 ---
  if (state === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">퀴즈를 준비하고 있어요...</p>
        </div>
      </div>
    )
  }

  // --- 결과 화면 ---
  if (state === 'result') {
    const correctCount = answers.filter((a) => a.isCorrect).length
    const total = answers.length
    const percentage = Math.round((correctCount / total) * 100)
    const wrongAnswers = answers.filter((a) => !a.isCorrect)

    let feedbackMessage = '다시 도전해 보세요!'
    let feedbackColor = 'text-orange-500'
    if (percentage === 100) {
      feedbackMessage = '완벽해요!'
      feedbackColor = 'text-green-500'
    } else if (percentage >= 80) {
      feedbackMessage = '훌륭해요!'
      feedbackColor = 'text-blue-500'
    } else if (percentage >= 60) {
      feedbackMessage = '좋아요!'
      feedbackColor = 'text-cyan-500'
    }

    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 점수 */}
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <Trophy className="h-12 w-12 mx-auto text-yellow-500" />
              <h2 className="text-2xl font-bold">퀴즈 결과</h2>
              <p className="text-4xl font-bold">
                {correctCount} / {total}
                <span className="text-lg ml-2 text-muted-foreground">({percentage}%)</span>
              </p>
              <p className={`text-lg font-semibold ${feedbackColor}`}>{feedbackMessage}</p>
            </CardContent>
          </Card>

          {/* 틀린 항목 */}
          {wrongAnswers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  틀린 {quizType === 'expression' ? '구문' : '단어'} ({wrongAnswers.length}개)
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllForReview(wrongAnswers)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  모두 복습 표시
                </Button>
              </div>
              {wrongAnswers.map((a, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{a.question.question}</p>
                        <p className="text-sm text-red-500">
                          내 답: {a.question.options[a.selectedIndex]}
                        </p>
                        <p className="text-sm text-green-600">
                          정답: {a.question.options[a.question.correctIndex]}
                        </p>
                      </div>
                      {reviewMarked.has(a.question.wordId) ? (
                        <span className="text-xs text-orange-500 font-medium px-2 py-1 bg-orange-50 dark:bg-orange-900/30 rounded">
                          복습 표시됨
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-500 hover:text-orange-600 shrink-0"
                          onClick={() => markForReview(a.question.wordId)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          복습 표시
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={() => { resetQuiz(); setTimeout(fetchQuiz, 0) }}>
              <RotateCcw className="h-4 w-4 mr-2" />
              다시 풀기
            </Button>
            <Button variant="outline" onClick={resetQuiz}>
              <Shuffle className="h-4 w-4 mr-2" />
              다른 문제 풀기
            </Button>
            <Button variant="outline" asChild>
              <Link href="/vocabulary">
                <BookOpen className="h-4 w-4 mr-2" />
                단어장으로
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- 퀴즈 진행 ---
  if (state === 'playing') {
    const current = questions[currentIndex]
    const progress = ((currentIndex + 1) / questions.length) * 100

    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 진행률 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{currentIndex + 1} / {questions.length}</span>
              <span className="flex items-center gap-1">
                {quizType === 'expression' ? (
                  <><Headphones className="h-3.5 w-3.5" /> 청해 구문</>
                ) : (
                  <><BookOpen className="h-3.5 w-3.5" /> 단어</>
                )}
                {' → 한국어'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 문제 */}
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                다음 {quizType === 'expression' ? '구문' : '단어'}의 뜻은?
              </p>
              <p className="text-3xl font-bold">{current.question}</p>
            </CardContent>
          </Card>

          {/* 선택지 */}
          <div className="space-y-3">
            {current.options.map((option, index) => {
              let variant: 'outline' | 'default' | 'destructive' = 'outline'
              let extraClass = 'hover:bg-accent'

              if (showFeedback) {
                if (index === current.correctIndex) {
                  variant = 'default'
                  extraClass = 'bg-green-600 hover:bg-green-600 text-white border-green-600'
                } else if (index === selectedIndex && index !== current.correctIndex) {
                  variant = 'destructive'
                  extraClass = ''
                } else {
                  extraClass = 'opacity-50'
                }
              }

              return (
                <Button
                  key={index}
                  variant={variant}
                  className={`w-full justify-start text-left h-auto py-4 px-5 text-base ${extraClass}`}
                  onClick={() => handleAnswer(index)}
                  disabled={showFeedback}
                >
                  <span className="mr-3 font-semibold text-muted-foreground">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                  {showFeedback && index === current.correctIndex && (
                    <CheckCircle2 className="h-5 w-5 ml-auto text-white" />
                  )}
                  {showFeedback && index === selectedIndex && index !== current.correctIndex && (
                    <XCircle className="h-5 w-5 ml-auto" />
                  )}
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // --- idle: 퀴즈 설정 ---
  const isExpression = quizType === 'expression'
  const listName = isExpression ? 'Lenz 픽' : 'Voca 리스트'

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Brain className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">퀴즈</h1>
          <p className="text-muted-foreground text-sm">
            저장한 항목으로 실력을 테스트해 보세요
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            {/* 퀴즈 유형 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">퀴즈 유형</label>
              <div className="inline-flex items-center rounded-xl bg-muted p-0.5 w-full">
                <button
                  onClick={() => setQuizType('word')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    quizType === 'word'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  단어 퀴즈
                </button>
                <button
                  onClick={() => setQuizType('expression')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    quizType === 'expression'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 shadow-sm text-indigo-700 dark:text-indigo-300'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Headphones className="h-4 w-4" />
                  청해 구문 퀴즈
                </button>
              </div>
            </div>

            {/* 문제 수 슬라이더 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">문제 수</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-sm font-semibold w-14 text-right">{questionCount}문제</span>
              </div>
            </div>

            {/* 퀴즈 범위 */}
            <div className="space-y-3">
              <label className="text-sm font-medium">퀴즈 범위</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sourceUnmemorized}
                    onChange={(e) => setSourceUnmemorized(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{listName} 미암기 {isExpression ? '구문' : '단어'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sourceMemorized}
                    onChange={(e) => setSourceMemorized(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{listName} 암기완료 {isExpression ? '구문' : '단어'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sourceHistory}
                    onChange={(e) => setSourceHistory(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">검색 이력 {isExpression ? '구문' : '단어'}</span>
                </label>
                {sourceHistory && (
                  <div className="ml-6 space-y-2">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="dateMode"
                          checked={historyDateMode === 'single'}
                          onChange={() => setHistoryDateMode('single')}
                          className="accent-primary"
                        />
                        <span className="text-xs">특정 날짜</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="dateMode"
                          checked={historyDateMode === 'range'}
                          onChange={() => setHistoryDateMode('range')}
                          className="accent-primary"
                        />
                        <span className="text-xs">기간 설정</span>
                      </label>
                    </div>
                    {historyDateMode === 'single' ? (
                      <div>
                        <label className="text-xs text-muted-foreground">이 날짜에 검색한 {isExpression ? '구문' : '단어'}</label>
                        <input
                          type="date"
                          value={historyDate}
                          onChange={(e) => setHistoryDate(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">시작일</label>
                          <input
                            type="date"
                            value={historyDate}
                            onChange={(e) => setHistoryDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">종료일</label>
                          <input
                            type="date"
                            value={historyDateTo}
                            onChange={(e) => setHistoryDateTo(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 총 단어 수 표시 (퀴즈 직전) */}
            {totalWords > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                범위 내 {isExpression ? '구문' : '단어'}: {totalWords}개
              </p>
            )}

            {/* 시작 버튼 */}
            <Button
              className="w-full"
              size="lg"
              onClick={fetchQuiz}
              disabled={!sourceUnmemorized && !sourceMemorized && !sourceHistory}
            >
              퀴즈 시작
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
