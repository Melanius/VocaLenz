'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDisplayPreferences } from '@/hooks/use-display-preferences'
import { useSearchContext } from '@/contexts/search-context'
import { getSessionId } from '@/lib/session'

interface MultiSearchInputProps {
  onSearchStart?: () => void
  autoFocus?: boolean
  compact?: boolean
}

export function MultiSearchInput({ onSearchStart, autoFocus = false, compact = false }: MultiSearchInputProps) {
  const { preferences } = useDisplayPreferences()
  const { addToHistory, updateHistoryItem } = useSearchContext()
  const [queries, setQueries] = useState<string[]>(Array(4).fill(''))
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const count = preferences.searchMode

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const updateQuery = useCallback((index: number, value: string) => {
    setQueries((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const activeQueries = queries.slice(0, count).filter((q) => q.trim())
    if (activeQueries.length === 0 || isSearching) return

    // 동시 검색 모드(2+)에서는 모든 입력창이 채워져야 함
    if (count > 1) {
      const allFilled = queries.slice(0, count).every((q) => q.trim())
      if (!allFilled) return
    }

    onSearchStart?.()
    setIsSearching(true)

    // 각 쿼리에 대해 병렬 검색
    const searchPromises = activeQueries.map(async (query) => {
      const trimmed = query.trim()
      const itemId = addToHistory(trimmed, { type: 'loading', message: '검색 중...' })

      try {
        const response = await fetch('/api/words/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: trimmed,
            sessionId: getSessionId(),
          }),
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
    })

    await Promise.all(searchPromises)
    setQueries(Array(4).fill(''))
    setIsSearching(false)
  }

  // 모드 1: 단일 검색 (라운드 검색창)
  if (count === 1) {
    return (
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="relative flex items-center">
          <Input
            ref={inputRef}
            type="text"
            placeholder="영어 단어를 검색하세요..."
            value={queries[0]}
            onChange={(e) => updateQuery(0, e.target.value)}
            maxLength={100}
            disabled={isSearching}
            className={`w-full pr-14 ${
              compact
                ? 'h-12 pl-4 text-sm rounded-xl'
                : 'h-14 pl-5 text-base rounded-full border-2 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20'
            } transition-all shadow-sm`}
          />
          <Button
            type="submit"
            size="icon"
            className={`absolute right-2 rounded-full ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}
            disabled={!queries[0].trim() || isSearching}
          >
            {isSearching ? (
              <Loader2 className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} animate-spin`} />
            ) : (
              <Search className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
            )}
          </Button>
        </div>
      </form>
    )
  }

  // 모드 2~4: N개 입력창 + 검색 버튼
  const allFilled = queries.slice(0, count).every((q) => q.trim())

  return (
    <form onSubmit={handleSubmit} className="space-y-2 w-full">
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="relative flex items-center">
            <span className="absolute left-3 text-xs text-muted-foreground font-medium">
              {i + 1}
            </span>
            <Input
              ref={i === 0 ? inputRef : undefined}
              type="text"
              placeholder={`단어 ${i + 1}`}
              value={queries[i]}
              onChange={(e) => updateQuery(i, e.target.value)}
              maxLength={100}
              disabled={isSearching}
              className={`w-full pl-8 pr-4 ${
                compact ? 'h-10 text-sm rounded-lg' : 'h-12 rounded-xl'
              }`}
            />
          </div>
        ))}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSearching || !allFilled}
      >
        {isSearching ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            검색 중...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            {count}개 동시 검색
          </>
        )}
      </Button>
    </form>
  )
}

