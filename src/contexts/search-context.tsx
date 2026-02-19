'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { SearchResult, SearchMode } from '@/types/database'

export interface SearchHistoryItem {
  id: string
  query: string
  result: SearchResult
  timestamp: number
}

interface SearchContextType {
  history: SearchHistoryItem[]
  addToHistory: (query: string, result: SearchResult) => string
  updateHistoryItem: (id: string, result: SearchResult) => void
  clearHistory: () => void
  scrollToItem: (id: string) => void
  searchCount: number
  searchType: SearchMode
  setSearchType: (mode: SearchMode) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [searchType, setSearchType] = useState<SearchMode>('word')

  const addToHistory = useCallback((query: string, result: SearchResult) => {
    const item: SearchHistoryItem = {
      id: crypto.randomUUID(),
      query,
      result,
      timestamp: Date.now(),
    }
    setHistory((prev) => [...prev, item])
    return item.id
  }, [])

  const updateHistoryItem = useCallback((id: string, result: SearchResult) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, result } : item))
    )
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // 헤더 로고 클릭 등 외부에서 리셋 요청 시 히스토리 초기화
  useEffect(() => {
    const handleReset = () => setHistory([])
    window.addEventListener('vocalenz:reset-search', handleReset)
    return () => window.removeEventListener('vocalenz:reset-search', handleReset)
  }, [])

  const scrollToItem = useCallback((id: string) => {
    const el = document.querySelector(`[data-search-id="${id}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-primary', 'rounded-lg')
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'rounded-lg'), 2000)
    }
  }, [])

  return (
    <SearchContext.Provider
      value={{
        history,
        addToHistory,
        updateHistoryItem,
        clearHistory,
        scrollToItem,
        searchCount: history.length,
        searchType,
        setSearchType,
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export function useSearchContext() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearchContext must be used within SearchProvider')
  }
  return context
}
