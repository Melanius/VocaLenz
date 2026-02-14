'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { History, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/components/providers/auth-provider'
import { WordCard } from '@/components/search/word-card'
import type { Word } from '@/types/database'

interface HistoryItem {
  id: string
  user_id: string
  word_id: string
  searched_at: string
  word: Word | null
}

interface GroupedHistory {
  label: string
  items: HistoryItem[]
}

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Essential', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  2: { label: 'Core', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  3: { label: 'Advanced', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  4: { label: 'Killer', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

function groupByDate(items: HistoryItem[]): GroupedHistory[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: Record<string, HistoryItem[]> = {
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

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuthContext()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchHistory = useCallback(async (pageNum: number, append = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/history?page=${pageNum}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setItems((prev) => append ? [...prev, ...data.items] : data.items)
        setHasMore(data.hasMore)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchHistory(1)
    }
  }, [user, fetchHistory])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchHistory(nextPage, true)
  }

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <History className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">어떤 단어를 공부했는지 한눈에</h2>
          <p className="text-muted-foreground">
            로그인하면 검색한 단어가 자동으로 기록되어<br />
            날짜별로 학습 이력을 확인할 수 있어요.
          </p>
          <Button asChild>
            <Link href="/auth/login">로그인하고 시작하기</Link>
          </Button>
        </div>
      </div>
    )
  }

  const grouped = groupByDate(items)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">검색 이력</h1>

        {loading && items.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <History className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">검색 이력이 없습니다.</p>
            <p className="text-sm text-muted-foreground">
              단어를 검색하면 이력이 자동으로 기록됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.label}>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const word = item.word
                    if (!word) return null
                    const isExpanded = expandedId === item.id
                    const levelConfig = LEVEL_CONFIG[word.difficulty_level] || LEVEL_CONFIG[2]
                    const time = new Date(item.searched_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="w-full text-left rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-semibold text-foreground">
                                {word.word}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${levelConfig.color}`}
                              >
                                Lv.{word.difficulty_level}
                              </span>
                              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                                {word.meanings[0]}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">{time}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="mt-2">
                            <WordCard word={word} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? '로딩 중...' : '더 보기'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
