'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/auth-provider'
import type { UserExpression } from '@/types/database'
import type { VocabPageFilters } from './use-vocabulary-page'

const PAGE_SIZE = 20

interface PageResponse {
  items: UserExpression[]
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

export function useExpressionVocabularyPage(filters: VocabPageFilters) {
  const { user } = useAuthContext()
  const [items, setItems] = useState<UserExpression[]>([])
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
    return `/api/vocabulary/expressions?${p}`
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

  const removeItem = useCallback((exprId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== exprId))
    setTotal((prev) => Math.max(0, prev - 1))
    setTotalAll((prev) => Math.max(0, prev - 1))
  }, [])

  const toggleMemorized = useCallback(async (userExprId: string, isMemorized: boolean) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === userExprId ? { ...item, is_memorized: isMemorized } : item
      )
      if (filters.status === 'memorized' && !isMemorized) return updated.filter((i) => i.id !== userExprId)
      if (filters.status === 'not-memorized' && isMemorized) return updated.filter((i) => i.id !== userExprId)
      return updated
    })
    try {
      await fetch('/api/vocabulary/expressions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userExpressionId: userExprId, is_memorized: isMemorized }),
      })
    } catch {
      setItems((prev) =>
        prev.map((item) => item.id === userExprId ? { ...item, is_memorized: !isMemorized } : item)
      )
    }
  }, [filters.status])

  const toggleNeedsReview = useCallback(async (userExprId: string, needsReview: boolean) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === userExprId ? { ...item, needs_review: needsReview } : item
      )
      if (filters.status === 'needs-review' && !needsReview) return updated.filter((i) => i.id !== userExprId)
      return updated
    })
    try {
      await fetch('/api/vocabulary/expressions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userExpressionId: userExprId, needs_review: needsReview }),
      })
    } catch {
      setItems((prev) =>
        prev.map((item) => item.id === userExprId ? { ...item, needs_review: !needsReview } : item)
      )
    }
  }, [filters.status])

  const updateMemo = useCallback(async (userExprId: string, memo: string) => {
    setItems((prev) =>
      prev.map((item) => item.id === userExprId ? { ...item, memo } : item)
    )
    try {
      await fetch('/api/vocabulary/expressions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userExpressionId: userExprId, memo }),
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
