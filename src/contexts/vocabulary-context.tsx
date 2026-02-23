'use client'

import { createContext, useContext } from 'react'
import { useVocabulary } from '@/hooks/use-vocabulary'

type VocabularyContextType = ReturnType<typeof useVocabulary>

const VocabularyContext = createContext<VocabularyContextType | null>(null)

export function VocabularyProvider({ children }: { children: React.ReactNode }) {
  const vocab = useVocabulary()
  return (
    <VocabularyContext.Provider value={vocab}>
      {children}
    </VocabularyContext.Provider>
  )
}

export function useVocabularyContext(): VocabularyContextType {
  const ctx = useContext(VocabularyContext)
  if (!ctx) throw new Error('useVocabularyContext must be used within VocabularyProvider')
  return ctx
}
