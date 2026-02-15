'use client'

import { useRef, useEffect, useState } from 'react'
import { BookOpen, History } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { MultiSearchInput } from '@/components/search/multi-search-input'
import { SearchResults } from '@/components/search/search-results'
import { RecommendedWords } from '@/components/search/recommended-words'
import { CardCustomizer } from '@/components/search/card-customizer'
import { Sidebar } from '@/components/layout/sidebar'
import { useSearchContext } from '@/contexts/search-context'

export default function SearchPage() {
  const { history, addToHistory, updateHistoryItem, scrollToItem } = useSearchContext()
  const scrollRef = useRef<HTMLDivElement>(null)
  const isEmpty = history.length === 0
  const [historyOpen, setHistoryOpen] = useState(false)

  // 새 결과 추가 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      // ScrollArea 내부의 viewport를 찾아 스크롤
      const viewport = el.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [history])

  const handleSearchWord = async (word: string) => {
    const itemId = addToHistory(word, { type: 'loading', message: '검색 중...' })

    try {
      const sessionId = getSessionId()
      const response = await fetch('/api/words/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: word, sessionId }),
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
    } catch {
      updateHistoryItem(itemId, {
        type: 'error',
        message: '네트워크 오류가 발생했습니다.',
      })
    }
  }

  // 최근 검색 단어 (word 타입만, 최신 5개)
  const recentWords = history
    .filter((item) => item.result.type === 'word')
    .slice(-5)
    .reverse()

  return (
    <div className="flex flex-col h-full">
      {isEmpty ? (
        /* 빈 상태: 중앙 정렬 */
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="mb-10 text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
              VocaLenz
            </h1>
            <p className="text-muted-foreground text-sm">
              AI 기반 영어 단어 학습 · TEPS/TOEIC 대비
            </p>
          </div>

          <div className="w-full max-w-2xl space-y-6">
            {/* 카드 설정 */}
            <div className="flex items-center justify-end">
              <CardCustomizer />
            </div>

            {/* 검색 입력 */}
            <MultiSearchInput autoFocus />

            {/* 추천 단어 */}
            <RecommendedWords onSearchWord={handleSearchWord} />

            {/* 제안 칩 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['amity', 'ubiquitous', 'ephemeral', 'pragmatic', 'resilient', 'verbose'].map(
                (word) => (
                  <button
                    key={word}
                    onClick={() => handleSearchWord(word)}
                    className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-sm text-foreground"
                  >
                    {word}
                  </button>
                )
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center max-w-md mx-auto">
              GPT-4o-mini 기반 AI Gatekeeper가 입력을 분석하여 정확한 단어 학습 카드를 생성합니다
            </p>
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
            className="fixed right-3 bottom-20 z-40 md:hidden h-10 w-10 rounded-full bg-primary/10 shadow-md"
            aria-label="검색 기록"
          >
            <History className="h-5 w-5 text-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0">
          <Sidebar open={true} onClose={() => setHistoryOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('vocalenz_session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('vocalenz_session_id', id)
  }
  return id
}
