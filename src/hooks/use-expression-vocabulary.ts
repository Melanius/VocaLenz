'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/auth-provider'
import { getSessionId } from '@/lib/session'
import type { UserExpression } from '@/types/database'

const MAX_EXPRESSION_SIZE = 2000

export function useExpressionVocabulary() {
  const { user } = useAuthContext()
  const [expressionItems, setExpressionItems] = useState<UserExpression[]>([])
  const [expressionIdSet, setExpressionIdSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const fetchVersionRef = useRef(0)

  const fetchExpressions = useCallback(async () => {
    if (!user) {
      setExpressionItems([])
      setExpressionIdSet(new Set())
      return
    }

    const version = ++fetchVersionRef.current
    setLoading(true)
    try {
      const res = await fetch('/api/vocabulary/expressions')
      if (res.ok && version === fetchVersionRef.current) {
        const data: UserExpression[] = await res.json()
        setExpressionItems(data)
        setExpressionIdSet(new Set(data.map((v) => v.expression_id)))
      }
    } catch {
      // silent fail
    } finally {
      if (version === fetchVersionRef.current) {
        setLoading(false)
      }
    }
  }, [user])

  useEffect(() => {
    fetchExpressions()

    const handleVisible = () => {
      if (!document.hidden) fetchExpressions()
    }
    const handleSearchComplete = () => fetchExpressions()

    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('vocalenz:search-complete', handleSearchComplete)
    return () => {
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('vocalenz:search-complete', handleSearchComplete)
    }
  }, [fetchExpressions])

  const isInExpressionVocabulary = useCallback(
    (expressionId: string) => expressionIdSet.has(expressionId),
    [expressionIdSet]
  )

  const addToExpressionVocabulary = useCallback(
    async (expressionId: string): Promise<{ success: boolean; message: string }> => {
      if (!user) return { success: false, message: '로그인이 필요합니다.' }
      if (expressionIdSet.size >= MAX_EXPRESSION_SIZE) {
        return { success: false, message: '표현 단어장이 가득 찼습니다. (최대 2000개)' }
      }

      try {
        const res = await fetch('/api/vocabulary/expressions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expressionId, sessionId: getSessionId() }),
        })

        if (res.ok) {
          await fetchExpressions()
          return { success: true, message: '표현 단어장에 추가되었습니다.' }
        }

        const error = await res.json()
        return { success: false, message: error.error || '추가에 실패했습니다.' }
      } catch {
        return { success: false, message: '추가에 실패했습니다.' }
      }
    },
    [user, expressionIdSet.size, fetchExpressions]
  )

  const removeFromExpressionVocabulary = useCallback(
    async (expressionId: string): Promise<{ success: boolean; message: string }> => {
      if (!user) return { success: false, message: '로그인이 필요합니다.' }

      const item = expressionItems.find((v) => v.expression_id === expressionId)
      if (!item) return { success: false, message: '단어장에 없는 표현입니다.' }

      try {
        const res = await fetch('/api/vocabulary/expressions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userExpressionId: item.id, sessionId: getSessionId() }),
        })

        if (res.ok) {
          await fetchExpressions()
          return { success: true, message: '표현 단어장에서 제거되었습니다.' }
        }

        return { success: false, message: '제거에 실패했습니다.' }
      } catch {
        return { success: false, message: '제거에 실패했습니다.' }
      }
    },
    [user, expressionItems, fetchExpressions]
  )

  const toggleMemorized = useCallback(
    async (userExpressionId: string, isMemorized: boolean) => {
      try {
        const res = await fetch('/api/vocabulary/expressions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userExpressionId, is_memorized: isMemorized }),
        })

        if (res.ok) {
          setExpressionItems((prev) =>
            prev.map((v) =>
              v.id === userExpressionId ? { ...v, is_memorized: isMemorized } : v
            )
          )
        }
      } catch {
        // silent fail
      }
    },
    []
  )

  const updateMemo = useCallback(async (userExpressionId: string, memo: string) => {
    try {
      const res = await fetch('/api/vocabulary/expressions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userExpressionId, memo }),
      })
      if (res.ok) {
        setExpressionItems((prev) =>
          prev.map((v) => v.id === userExpressionId ? { ...v, memo } : v)
        )
      }
    } catch {
      // silent fail
    }
  }, [])

  return {
    expressionItems,
    expressionIdSet,
    loading,
    count: expressionItems.length,
    isInExpressionVocabulary,
    addToExpressionVocabulary,
    removeFromExpressionVocabulary,
    toggleMemorized,
    updateMemo,
    refresh: fetchExpressions,
  }
}
