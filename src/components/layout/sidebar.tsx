'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { History, ChevronDown, Loader2, X, BookOpen, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthContext } from '@/components/providers/auth-provider'
import type { Word, Expression, SearchMode } from '@/types/database'

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

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  const [dbHistory, setDbHistory] = useState<UnifiedHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const fetchHistory = useCallback(async (pageNum: number, append = false) => {
    setLoading(true)
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
      setHasMore(wordData.hasMore || exprData.hasMore)
      setLoaded(true)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && !loaded) {
      fetchHistory(1)
    }
  }, [user, loaded, fetchHistory])

  // 새 검색 완료 시 이력 실시간 갱신
  useEffect(() => {
    const handleSearchComplete = () => {
      setPage(1)
      fetchHistory(1)
    }
    window.addEventListener('vocalenz:search-complete', handleSearchComplete)
    return () => window.removeEventListener('vocalenz:search-complete', handleSearchComplete)
  }, [fetchHistory])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchHistory(nextPage, true)
  }

  const handleSearchWord = (word: string, mode: SearchMode) => {
    if (pathname === '/') {
      // 검색 페이지에 있을 때: 이벤트로 page.tsx의 handleSearchWord 호출
      window.dispatchEvent(
        new CustomEvent('vocalenz:trigger-search', { detail: { word, mode } })
      )
    } else {
      // 다른 탭에 있을 때: URL params로 검색 페이지 이동 후 자동 검색
      router.push(`/?q=${encodeURIComponent(word)}&mode=${mode}`)
    }
  }

  const grouped = groupByDate(dbHistory)

  return (
    <div
      className={`
        flex flex-col h-full bg-card border-r
        ${open !== undefined ? (open ? 'translate-x-0' : '-translate-x-full') : ''}
        transition-transform duration-200
      `}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">검색 이력</h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden"
            onClick={onClose}
            aria-label="사이드바 닫기"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* 이력 목록 */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {!user ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              로그인하면 검색 이력을 볼 수 있어요.
            </p>
          ) : loading && !loaded ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">검색 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
                    {group.label}
                  </h3>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isExpr = item.type === 'expression'
                      const label = isExpr ? item.expression?.expression : item.word?.word
                      const meanings = isExpr ? item.expression?.meanings : item.word?.meanings
                      if (!label) return null
                      const mode: SearchMode = isExpr ? 'expression' : 'word'
                      const time = new Date(item.searched_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSearchWord(label, mode)}
                          className="w-full text-left rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isExpr ? (
                                <Headphones className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                              ) : (
                                <BookOpen className="h-3 w-3 text-sky-500 flex-shrink-0" />
                              )}
                              <span className="font-semibold text-xs text-foreground truncate">
                                {label}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {time}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 pl-[18px]">
                            {meanings?.[0]}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="text-center pb-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        로딩 중...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1.5" />
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
  )
}
