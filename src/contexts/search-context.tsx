'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { SearchResult } from '@/types/database'

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
  searchCount: number
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])

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

  return (
    <SearchContext.Provider
      value={{
        history,
        addToHistory,
        updateHistoryItem,
        clearHistory,
        searchCount: history.length,
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
