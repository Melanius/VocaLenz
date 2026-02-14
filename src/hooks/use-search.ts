'use client'

import { useState, useCallback } from 'react'
import { getSessionId } from '@/lib/session'
import type { SearchResult } from '@/types/database'

interface SearchState {
  isLoading: boolean
  error: string | null
  result: SearchResult | null
  remaining: number | null
}

interface UseSearchReturn extends SearchState {
  search: (input: string) => Promise<void>
  reset: () => void
}

export function useSearch(): UseSearchReturn {
  const [state, setState] = useState<SearchState>({
    isLoading: false,
    error: null,
    result: null,
    remaining: null,
  })

  const search = useCallback(async (input: string) => {
    if (!input.trim()) {
      setState((prev) => ({
        ...prev,
        error: '검색어를 입력해 주세요.',
      }))
      return
    }

    setState({
      isLoading: true,
      error: null,
      result: { type: 'loading', message: '검색 중...' },
      remaining: state.remaining,
    })

    try {
      const sessionId = getSessionId()

      const response = await fetch('/api/words/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setState({
            isLoading: false,
            error: data.error || '검색 한도를 초과했습니다.',
            result: null,
            remaining: 0,
          })
          return
        }

        setState({
          isLoading: false,
          error: data.error || '검색 중 오류가 발생했습니다.',
          result: null,
          remaining: state.remaining,
        })
        return
      }

      setState({
        isLoading: false,
        error: null,
        result: data.result,
        remaining: data.remaining ?? null,
      })
    } catch (error) {
      console.error('Search error:', error)
      setState({
        isLoading: false,
        error: '네트워크 오류가 발생했습니다. 다시 시도해 주세요.',
        result: null,
        remaining: state.remaining,
      })
    }
  }, [state.remaining])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
      remaining: null,
    })
  }, [])

  return {
    ...state,
    search,
    reset,
  }
}
