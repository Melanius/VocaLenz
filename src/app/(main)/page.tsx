'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { History, ChevronDown, Loader2, BookOpen, Headphones } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { MultiSearchInput } from '@/components/search/multi-search-input'
import { SearchResults } from '@/components/search/search-results'
import { RecommendedWords } from '@/components/search/recommended-words'
import { CardCustomizer } from '@/components/search/card-customizer'
import { useSearchContext } from '@/contexts/search-context'
import { useAuthContext } from '@/components/providers/auth-provider'
import { useDisplayPreferences } from '@/hooks/use-display-preferences'
import { useVocabulary } from '@/hooks/use-vocabulary'
import { useExpressionVocabulary } from '@/hooks/use-expression-vocabulary'
import { useTheme } from '@/components/providers/theme-provider'
import { getSessionId } from '@/lib/session'
import { analytics } from '@/lib/analytics'
import type { Word, Expression, SearchMode } from '@/types/database'

const SEASON_IMAGES: Record<string, string> = {
  spring: '/video/spring.png',
  summer: '/video/summer.png',
  fall: '/video/fall.png',
  winter: '/video/winter.png',
}

type UnifiedHistoryItem =
  | { type: 'word'; id: string; searched_at: string; word: Word | null }
  | { type: 'expression'; id: string; searched_at: string; expression: Expression | null }

interface GroupedHistory {
  label: string
  items: UnifiedHistoryItem[]
}

function groupByDate(items: UnifiedHistoryItem[]): GroupedHistory[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: Record<string, UnifiedHistoryItem[]> = {
    '오늘': [],
    '어제': [],
    '이번 주': [],
    '이전': [],
  }

  for (const item of items) {
    const date = new Date(item.searched_at)
    if (date >= today) {
      groups['오늘'].push(item)
    } else if (date >= yesterday) {
      groups['어제'].push(item)
    } else if (date >= weekAgo) {
      groups['이번 주'].push(item)
    } else {
      groups['이전'].push(item)
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

export default function SearchPage() {
  const { history, addToHistory, updateHistoryItem, scrollToItem, searchType, setSearchType } = useSearchContext()
  const { user } = useAuthContext()
  const { preferences } = useDisplayPreferences()
  const { isInVocabulary, addToVocabulary } = useVocabulary()
  const { isInExpressionVocabulary, addToExpressionVocabulary } = useExpressionVocabulary()
  const { season } = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)
  const isEmpty = history.length === 0
  const [historyOpen, setHistoryOpen] = useState(false)

  // 계절 테마에 맞는 이미지 선택
  const seasonImage = SEASON_IMAGES[season] || SEASON_IMAGES.winter

  // DB 검색 이력 상태 (바텀 시트용)
  const [dbHistory, setDbHistory] = useState<UnifiedHistoryItem[]>([])
  const [dbHistoryLoading, setDbHistoryLoading] = useState(false)
  const [dbHistoryPage, setDbHistoryPage] = useState(1)
  const [dbHistoryHasMore, setDbHistoryHasMore] = useState(false)
  const [dbHistoryLoaded, setDbHistoryLoaded] = useState(false)

  // session_start 이벤트 (최초 1회)
  useEffect(() => {
    analytics.track('session_start', {
      referrer: document.referrer || null,
      screen: `${window.screen.width}x${window.screen.height}`,
      lang: navigator.language,
    })
  }, [])

  const fetchDbHistory = useCallback(async (pageNum: number, append = false) => {
    setDbHistoryLoading(true)
    try {
      const [wordRes, exprRes] = await Promise.all([
        fetch(`/api/history?page=${pageNum}&limit=20&type=word`),
        fetch(`/api/history?page=${pageNum}&limit=20&type=expression`),
      ])
      const wordData = wordRes.ok ? await wordRes.json() : { items: [], hasMore: false }
      const exprData = exprRes.ok ? await exprRes.json() : { items: [], hasMore: false }

      const wordItems: UnifiedHistoryItem[] = (wordData.items || []).map(
        (i: { id: string; searched_at: string; word: Word | null }) => ({ ...i, type: 'word' as const })
      )
      const exprItems: UnifiedHistoryItem[] = (exprData.items || []).map(
        (i: { id: string; searched_at: string; expression: Expression | null }) => ({ ...i, type: 'expression' as const })
      )

      const merged = [...wordItems, ...exprItems].sort(
        (a, b) => new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime()
      )

      setDbHistory((prev) => append ? [...prev, ...merged] : merged)
      setDbHistoryHasMore(wordData.hasMore || exprData.hasMore)
      setDbHistoryLoaded(true)
    } catch {
      // silent
    } finally {
      setDbHistoryLoading(false)
    }
  }, [])

  // 바텀 시트 열릴 때 DB 이력 로드
  useEffect(() => {
    if (historyOpen && user && !dbHistoryLoaded) {
      fetchDbHistory(1)
    }
  }, [historyOpen, user, dbHistoryLoaded, fetchDbHistory])

  const loadMoreDbHistory = () => {
    const nextPage = dbHistoryPage + 1
    setDbHistoryPage(nextPage)
    fetchDbHistory(nextPage, true)
  }

  // 새 결과 추가 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      const viewport = el.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [history])

  const urlSearchDoneRef = useRef(false)

  // 사이드바에서 이벤트로 검색 트리거받을 때 사용할 ref (stale closure 방지)
  const handleSearchWordRef = useRef<(word: string, modeOverride?: SearchMode) => void>(() => {})

  // URL 파라미터로 검색 트리거 (history 페이지 등에서 이동 시)
  useEffect(() => {
    if (urlSearchDoneRef.current) return
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) {
      urlSearchDoneRef.current = true
      const mode = params.get('mode') as SearchMode | null
      window.history.replaceState({}, '', '/')
      handleSearchWord(decodeURIComponent(q), mode || undefined)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearchWord = async (word: string, modeOverride?: SearchMode) => {
    setHistoryOpen(false)

    // 현재 세션 채팅에 이미 있으면 스크롤만 (새 검색 안 함)
    const existing = history.find((item) => {
      if (item.result.type === 'word') return item.result.data?.word === word
      if (item.result.type === 'expression') return item.result.data?.expression === word
      return false
    })
    if (existing) {
      scrollToItem(existing.id)
      return
    }

    const itemId = addToHistory(word, { type: 'loading', message: '검색 중...' })
    const mode = modeOverride || searchType

    try {
      const sessionId = getSessionId()
      const response = await fetch('/api/words/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: word, sessionId, mode }),
      })

      const data = await response.json()

      if (!response.ok) {
        updateHistoryItem(itemId, {
          type: 'error',
          message: data.error || '검색 중 오류가 발생했습니다.',
        })
        return
      }

      updateHistoryItem(itemId, data.result)

      // 사이드바 실시간 갱신 트리거
      window.dispatchEvent(new CustomEvent('vocalenz:search-complete'))

      // 자동 단어장 저장
      if (preferences.autoSaveToVocabulary && user) {
        if (
          data.result.type === 'word' &&
          !isInVocabulary(data.result.data.id)
        ) {
          addToVocabulary(data.result.data.id)
        } else if (
          data.result.type === 'expression' &&
          !isInExpressionVocabulary(data.result.data.id)
        ) {
          addToExpressionVocabulary(data.result.data.id)
        }
      }
    } catch {
      updateHistoryItem(itemId, {
        type: 'error',
        message: '네트워크 오류가 발생했습니다.',
      })
    }
  }

  // ref를 항상 최신 handleSearchWord로 유지 (이벤트 리스너의 stale closure 방지)
  useEffect(() => {
    handleSearchWordRef.current = handleSearchWord
  })

  // 사이드바에서 vocalenz:trigger-search 이벤트 수신 시 검색 실행
  useEffect(() => {
    const handler = (e: Event) => {
      const { word, mode } = (e as CustomEvent<{ word: string; mode: SearchMode }>).detail
      handleSearchWordRef.current(word, mode)
    }
    window.addEventListener('vocalenz:trigger-search', handler)
    return () => window.removeEventListener('vocalenz:trigger-search', handler)
  }, [])

  // 최근 검색 단어/표현 (word/expression 타입, 최신 5개)
  const recentWords = history
    .filter((item) => item.result.type === 'word' || item.result.type === 'expression')
    .slice(-5)
    .reverse()

  const grouped = groupByDate(dbHistory)

  return (
    <div className="flex flex-col h-full">
      {isEmpty ? (
        /* 빈 상태: 중앙 정렬 */
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center px-4 pt-12 pb-8">
            <div className="mb-10 text-center w-full max-w-md mx-auto">
              <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={seasonImage}
                  src={seasonImage}
                  alt="VocaLenz"
                  className="w-full h-auto rounded-lg"
                />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
                VocaLenz
              </h1>
              <p className="text-muted-foreground text-sm">
                나만의 TEPS AI 튜터
              </p>
            </div>

            <div className="w-full max-w-2xl space-y-6">
              {/* 단어/표현 탭 토글 */}
              <SearchTypeToggle value={searchType} onChange={setSearchType} />

              {/* 검색 입력 + 카드 설정 */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <MultiSearchInput autoFocus />
                </div>
                <CardCustomizer />
              </div>

              {/* 추천 단어 */}
              <RecommendedWords onSearchWord={handleSearchWord} />

              <p className="text-xs text-muted-foreground text-center max-w-md mx-auto">
                AI가 입력을 분석하여 {searchType === 'expression' ? '청해 학습 카드 (Lenz 픽 자동 저장)' : '독해 학습 카드 (Voca 리스트 자동 저장)'}를 생성합니다
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 채팅 상태: 스크롤 영역 + 하단 고정 입력 */
        <>
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {history.map((item) => (
                <div key={item.id} data-search-id={item.id}>
                  <SearchResults
                    query={item.query}
                    result={item.result}
                    onSearchWord={handleSearchWord}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t bg-background/95 backdrop-blur p-4">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* 모바일: 최근 검색 칩 */}
              {recentWords.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 md:hidden">
                  {recentWords.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToItem(item.id)}
                      className="shrink-0 px-2.5 py-1 rounded-full bg-muted text-xs text-foreground hover:bg-accent transition-colors"
                    >
                      {item.query}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <SearchTypeToggle value={searchType} onChange={setSearchType} compact />
                <div className="flex-1">
                  <MultiSearchInput compact />
                </div>
                <CardCustomizer />
              </div>
            </div>
          </div>
        </>
      )}

      {/* 모바일: 검색 기록 바텀 시트 */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed right-3 bottom-20 z-40 md:hidden h-14 w-14 rounded-full bg-primary/10 shadow-lg"
            aria-label="검색 기록"
          >
            <History className="h-6 w-6 text-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0">
          <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">검색 이력</h2>
            </div>

            {/* 이력 목록 */}
            <ScrollArea className="flex-1">
              <div className="px-4 py-3">
                {!user ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    로그인하면 검색 이력을 볼 수 있어요.
                  </p>
                ) : dbHistoryLoading && !dbHistoryLoaded ? (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : grouped.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">검색 이력이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {grouped.map((group) => (
                      <div key={group.label}>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">
                          {group.label}
                        </h3>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const isExpr = item.type === 'expression'
                            const label = isExpr ? item.expression?.expression : item.word?.word
                            const meanings = isExpr ? item.expression?.meanings : item.word?.meanings
                            if (!label) return null
                            const time = new Date(item.searched_at).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                            const mode: SearchMode = isExpr ? 'expression' : 'word'

                            return (
                              <button
                                key={item.id}
                                onClick={() => handleSearchWord(label, mode)}
                                className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isExpr ? (
                                      <Headphones className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                                    ) : (
                                      <BookOpen className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                                    )}
                                    <span className="font-semibold text-sm text-foreground truncate">
                                      {label}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {meanings?.[0]}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                    {time}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {dbHistoryHasMore && (
                      <div className="text-center pb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadMoreDbHistory}
                          disabled={dbHistoryLoading}
                        >
                          {dbHistoryLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              로딩 중...
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                              더 보기
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SearchTypeToggle({
  value,
  onChange,
  compact = false,
}: {
  value: SearchMode
  onChange: (mode: SearchMode) => void
  compact?: boolean
}) {
  const isExpression = value === 'expression'

  return (
    <div
      className={`inline-flex items-center rounded-xl p-0.5 transition-colors duration-300 ${
        compact ? '' : 'mx-auto flex justify-center'
      } ${
        isExpression
          ? 'bg-indigo-100/70 dark:bg-indigo-950/50'
          : 'bg-muted'
      }`}
    >
      {/* 단어 (Word) */}
      <button
        type="button"
        onClick={() => onChange('word')}
        className={`flex items-center gap-1.5 rounded-lg transition-all ${
          compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
        } ${
          value === 'word'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <BookOpen className={compact ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
        {compact ? (
          <span className="text-sm font-medium">단어</span>
        ) : (
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-semibold">단어</span>
            <span className="text-[10px] opacity-60 font-normal mt-0.5">Word</span>
          </div>
        )}
      </button>

      {/* 청해 구문 (Phrase) */}
      <button
        type="button"
        onClick={() => onChange('expression')}
        className={`flex items-center gap-1.5 rounded-lg transition-all ${
          compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
        } ${
          value === 'expression'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Headphones className={compact ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
        {compact ? (
          <span className="text-sm font-medium">청해구문</span>
        ) : (
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-semibold">청해 구문</span>
            <span className="text-[10px] opacity-60 font-normal mt-0.5">Phrase</span>
          </div>
        )}
      </button>
    </div>
  )
}
