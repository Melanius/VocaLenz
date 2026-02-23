'use client'

import { createContext, useContext } from 'react'
import { useExpressionVocabulary } from '@/hooks/use-expression-vocabulary'

type ExpressionVocabularyContextType = ReturnType<typeof useExpressionVocabulary>

const ExpressionVocabularyContext = createContext<ExpressionVocabularyContextType | null>(null)

export function ExpressionVocabularyProvider({ children }: { children: React.ReactNode }) {
  const exprVocab = useExpressionVocabulary()
  return (
    <ExpressionVocabularyContext.Provider value={exprVocab}>
      {children}
    </ExpressionVocabularyContext.Provider>
  )
}

export function useExpressionVocabularyContext(): ExpressionVocabularyContextType {
  const ctx = useContext(ExpressionVocabularyContext)
  if (!ctx) throw new Error('useExpressionVocabularyContext must be used within ExpressionVocabularyProvider')
  return ctx
}
