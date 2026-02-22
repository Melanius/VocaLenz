'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/auth-provider'
import { getSessionId } from '@/lib/session'
import type { UserVocabulary } from '@/types/database'

const MAX_VOCABULARY_SIZE = 2000

export function useVocabulary() {
  const { user } = useAuthContext()
  const [vocabularyItems, setVocabularyItems] = useState<UserVocabulary[]>([])
  const [wordIdSet, setWordIdSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const fetchVersionRef = useRef(0)

  const fetchVocabulary = useCallback(async () => {
    if (!user) {
      setVocabularyItems([])
      setWordIdSet(new Set())
      return
    }

    const version = ++fetchVersionRef.current
    setLoading(true)
    try {
      const res = await fetch('/api/vocabulary')
      if (res.ok && version === fetchVersionRef.current) {
        const data: UserVocabulary[] = await res.json()
        setVocabularyItems(data)
        setWordIdSet(new Set(data.map((v) => v.word_id)))
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
    fetchVocabulary()

    const handleVisible = () => {
      if (!document.hidden) fetchVocabulary()
    }
    const handleSearchComplete = () => fetchVocabulary()

    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('vocalenz:search-complete', handleSearchComplete)
    return () => {
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('vocalenz:search-complete', handleSearchComplete)
    }
  }, [fetchVocabulary])

  const isInVocabulary = useCallback(
    (wordId: string) => wordIdSet.has(wordId),
    [wordIdSet]
  )

  const addToVocabulary = useCallback(
    async (wordId: string): Promise<{ success: boolean; message: string }> => {
      if (!user) return { success: false, message: '로그인이 필요합니다.' }
      if (wordIdSet.size >= MAX_VOCABULARY_SIZE) {
        return { success: false, message: '단어장이 가득 찼습니다. (최대 2000개)' }
      }

      try {
        const res = await fetch('/api/vocabulary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wordId, sessionId: getSessionId() }),
        })

        if (res.ok) {
          await fetchVocabulary()
          return { success: true, message: '단어장에 추가되었습니다.' }
        }

        const error = await res.json()
        return { success: false, message: error.error || '추가에 실패했습니다.' }
      } catch {
        return { success: false, message: '추가에 실패했습니다.' }
      }
    },
    [user, wordIdSet.size, fetchVocabulary]
  )

  const removeFromVocabulary = useCallback(
    async (wordId: string): Promise<{ success: boolean; message: string }> => {
      if (!user) return { success: false, message: '로그인이 필요합니다.' }

      const vocabItem = vocabularyItems.find((v) => v.word_id === wordId)
      if (!vocabItem) return { success: false, message: '단어장에 없는 단어입니다.' }

      try {
        const res = await fetch('/api/vocabulary', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vocabularyId: vocabItem.id, sessionId: getSessionId() }),
        })

        if (res.ok) {
          await fetchVocabulary()
          return { success: true, message: '단어장에서 제거되었습니다.' }
        }

        return { success: false, message: '제거에 실패했습니다.' }
      } catch {
        return { success: false, message: '제거에 실패했습니다.' }
      }
    },
    [user, vocabularyItems, fetchVocabulary]
  )

  const toggleMemorized = useCallback(
    async (vocabId: string, isMemorized: boolean) => {
      try {
        const res = await fetch('/api/vocabulary', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vocabularyId: vocabId, is_memorized: isMemorized, sessionId: getSessionId() }),
        })

        if (res.ok) {
          setVocabularyItems((prev) =>
            prev.map((v) =>
              v.id === vocabId ? { ...v, is_memorized: isMemorized } : v
            )
          )
        }
      } catch {
        // silent fail
      }
    },
    []
  )

  const updateMemo = useCallback(async (vocabId: string, memo: string) => {
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabularyId: vocabId, memo }),
      })
      if (res.ok) {
        setVocabularyItems((prev) =>
          prev.map((v) => v.id === vocabId ? { ...v, memo } : v)
        )
      }
    } catch {
      // silent fail
    }
  }, [])

  return {
    vocabularyItems,
    wordIdSet,
    loading,
    count: vocabularyItems.length,
    isInVocabulary,
    addToVocabulary,
    removeFromVocabulary,
    toggleMemorized,
    updateMemo,
    refresh: fetchVocabulary,
  }
}
