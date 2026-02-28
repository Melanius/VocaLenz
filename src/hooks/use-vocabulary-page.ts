'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/auth-provider'
import type { UserVocabulary } from '@/types/database'

const PAGE_SIZE = 20

export interface VocabPageFilters {
  status: string       // 'all' | 'memorized' | 'not-memorized' | 'needs-review'
  dateFrom: string     // 'YYYY-MM-DD' or ''
  dateTo: string       // 'YYYY-MM-DD' or ''
  memo: string         // text search
  shuffleSeed: number  // 0 = no shuffle
}

interface PageResponse {
  items: UserVocabulary[]
  total: number
  totalAll: number
  hasMore: boolean
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function useVocabularyPage(filters: VocabPageFilters) {
  const { user } = useAuthContext()
  const [items, setItems] = useState<UserVocabulary[]>([])
  const [total, setTotal] = useState(0)
  const [totalAll, setTotalAll] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const offsetRef = useRef(0)
  const fetchVersionRef = useRef(0)

  const buildUrl = useCallback((offset: number, limit: number) => {
    const p = new URLSearchParams({
      mode: 'page',
      limit: String(limit),
      offset: String(offset),
    })
    if (filters.status && filters.status !== 'all') p.set('status', filters.status)
    if (filters.dateFrom) p.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) p.set('dateTo', filters.dateTo)
    if (filters.memo.trim()) p.set('memo', filters.memo.trim())
    return `/api/vocabulary?${p}`
  }, [filters.status, filters.dateFrom, filters.dateTo, filters.memo])

  const fetchInitial = useCallback(async () => {
    if (!user) {
      setItems([])
      setTotal(0)
      setTotalAll(0)
      setHasMore(false)
      offsetRef.current = 0
      return
    }
    const version = ++fetchVersionRef.current
    setLoading(true)
    offsetRef.current = 0

    try {
      if (filters.shuffleSeed) {
        // Shuffle mode: fetch all items, then shuffle client-side
        const res = await fetch(buildUrl(0, 9999))
        if (!res.ok || version !== fetchVersionRef.current) return
        const data: PageResponse = await res.json()
        if (version !== fetchVersionRef.current) return
        setItems(seededShuffle(data.items, filters.shuffleSeed))
        setTotal(data.total)
        setTotalAll(data.totalAll)
        setHasMore(false)
        offsetRef.current = data.items.length
        return
      }

      const res = await fetch(buildUrl(0, PAGE_SIZE))
      if (!res.ok || version !== fetchVersionRef.current) return
      const data: PageResponse = await res.json()
      if (version !== fetchVersionRef.current) return
      setItems(data.items)
      setTotal(data.total)
      setTotalAll(data.totalAll)
      setHasMore(data.hasMore)
      offsetRef.current = data.items.length
    } catch {
      // silent fail
    } finally {
      if (version === fetchVersionRef.current) setLoading(false)
    }
  }, [user, buildUrl, filters.shuffleSeed])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  const loadMore = useCallback(async () => {
    if (!user || !hasMore || loadingMore || loading || filters.shuffleSeed) return
    const version = fetchVersionRef.current
    setLoadingMore(true)
    try {
      const res = await fetch(buildUrl(offsetRef.current, PAGE_SIZE))
      if (!res.ok || version !== fetchVersionRef.current) return
      const data: PageResponse = await res.json()
      if (version !== fetchVersionRef.current) return
      setItems((prev) => [...prev, ...data.items])
      setHasMore(data.hasMore)
      offsetRef.current += data.items.length
    } catch {
      // silent fail
    } finally {
      setLoadingMore(false)
    }
  }, [user, hasMore, loadingMore, loading, buildUrl, filters.shuffleSeed])

  const refresh = useCallback(() => {
    fetchInitial()
  }, [fetchInitial])

  const removeItem = useCallback((vocabId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== vocabId))
    setTotal((prev) => Math.max(0, prev - 1))
    setTotalAll((prev) => Math.max(0, prev - 1))
  }, [])

  const toggleMemorized = useCallback(async (vocabId: string, isMemorized: boolean) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === vocabId ? { ...item, is_memorized: isMemorized } : item
      )
      // Remove from view if item no longer matches active filter
      if (filters.status === 'memorized' && !isMemorized) return updated.filter((i) => i.id !== vocabId)
      if (filters.status === 'not-memorized' && isMemorized) return updated.filter((i) => i.id !== vocabId)
      return updated
    })
    try {
      await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabularyId: vocabId, is_memorized: isMemorized }),
      })
    } catch {
      // Rollback
      setItems((prev) =>
        prev.map((item) => item.id === vocabId ? { ...item, is_memorized: !isMemorized } : item)
      )
    }
  }, [filters.status])

  const toggleNeedsReview = useCallback(async (vocabId: string, needsReview: boolean) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === vocabId ? { ...item, needs_review: needsReview } : item
      )
      // Remove from view if item no longer matches 'needs-review' filter
      if (filters.status === 'needs-review' && !needsReview) return updated.filter((i) => i.id !== vocabId)
      return updated
    })
    try {
      await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabularyId: vocabId, needs_review: needsReview }),
      })
    } catch {
      // Rollback
      setItems((prev) =>
        prev.map((item) => item.id === vocabId ? { ...item, needs_review: !needsReview } : item)
      )
    }
  }, [filters.status])

  const updateMemo = useCallback(async (vocabId: string, memo: string) => {
    setItems((prev) =>
      prev.map((item) => item.id === vocabId ? { ...item, memo } : item)
    )
    try {
      await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabularyId: vocabId, memo }),
      })
    } catch {
      // silent fail
    }
  }, [])

  return {
    items,
    total,
    totalAll,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    removeItem,
    toggleMemorized,
    toggleNeedsReview,
    updateMemo,
  }
}
