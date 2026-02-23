'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Headphones, Star, Loader2, Upload, Search, Shuffle, X, StickyNote, Settings, AlertCircle, ChevronDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuthContext } from '@/components/providers/auth-provider'
import { useVocabulary } from '@/hooks/use-vocabulary'
import { useExpressionVocabulary } from '@/hooks/use-expression-vocabulary'
import { toast } from '@/hooks/use-toast'
import { WordCard } from '@/components/search/word-card'
import { ExpressionCard } from '@/components/search/expression-card'
import { VocabularyFlipCard } from '@/components/vocabulary/vocabulary-flip-card'
import { ExpressionFlipCard } from '@/components/vocabulary/expression-flip-card'
import { CardCustomizer } from '@/components/search/card-customizer'
import { getRandomPhrase, type LoadingPhrase } from '@/lib/loading-phrases'
import type { UserVocabulary, UserExpression, Word, Expression } from '@/types/database'

type FilterType = 'all' | 'not-memorized' | 'memorized' | 'needs-review'

interface BulkProgress {
  current: number
  total: number
  word: string
  status: string
  error?: string
  correction?: string
  gkStatus?: string
}

interface BulkComplete {
  added: number
  skipped: number
  failed: number
}

interface RetryItem {
  originalWord: string
  retryWord: string
  type: 'correction' | 'force'
  selected: boolean
}

type VocabTab = 'words' | 'expressions'

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

export default function VocabularyPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { vocabularyItems, count, loading, toggleMemorized, updateMemo, refresh } = useVocabulary()
  const { expressionItems, count: exprCount, loading: exprLoading, toggleMemorized: toggleExprMemorized, updateMemo: updateExprMemo, refresh: refreshExpr } = useExpressionVocabulary()
  const [vocabTab, setVocabTab] = useState<VocabTab>('words')
  const [filter, setFilter] = useState<FilterType>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [detailWord, setDetailWord] = useState<Word | null>(null)
  const [detailExpression, setDetailExpression] = useState<Expression | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [memoFilter, setMemoFilter] = useState('')
  const [customizerOpen, setCustomizerOpen] = useState(false)

  // 업로드 상태
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<'word' | 'expression'>('word')
  const [parsedWords, setParsedWords] = useState<{ word: string; memo?: string }[]>([])
  const [filteredOutItems, setFilteredOutItems] = useState<string[]>([])
  const [showExcluded, setShowExcluded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<BulkProgress[]>([])
  const [uploadResult, setUploadResult] = useState<BulkComplete | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadStalled, setUploadStalled] = useState(false)
  const [retryItems, setRetryItems] = useState<RetryItem[]>([])
  const [uploadTotal, setUploadTotal] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<UserVocabulary | null>(null)
  const [pendingExprDelete, setPendingExprDelete] = useState<UserExpression | null>(null)
  const [shuffleSeed, setShuffleSeed] = useState(0)

  // Level 변경 제안 알림 확인 (페이지 로드 시 1회)
  useEffect(() => {
    if (!user) return
    fetch('/api/level-requests/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (!data.notifications?.length) return
        data.notifications.forEach((n: {
          status: 'approved' | 'rejected'
          name: string
          currentLevel: number
          requestedLevel: number
          adminReason?: string
        }) => {
          if (n.status === 'approved') {
            toast({
              title: 'Level 변경 승인',
              description: `"${n.name}" Lv.${n.currentLevel} → Lv.${n.requestedLevel}로 변경되었습니다.`,
            })
          } else {
            toast({
              title: 'Level 변경 제안 반려',
              description: n.adminReason
                ? `"${n.name}": ${n.adminReason}`
                : `"${n.name}"의 레벨 변경이 반려되었습니다.`,
            })
          }
        })
      })
      .catch(() => {})
  }, [user])

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const hasDateFilter = dateFrom !== '' || dateTo !== ''

  const memoFilterLower = memoFilter.trim().toLowerCase()

  const filtered = useMemo(() => {
    const items = vocabularyItems.filter((item) => {
      if (filter === 'memorized' && !item.is_memorized) return false
      if (filter === 'not-memorized' && item.is_memorized) return false
      if (filter === 'needs-review' && !item.needs_review) return false
      if (hasDateFilter && item.added_at) {
        const addedDate = item.added_at.slice(0, 10)
        if (dateFrom && addedDate < dateFrom) return false
        if (dateTo && addedDate > dateTo) return false
      }
      if (memoFilterLower && !(item.memo || '').toLowerCase().includes(memoFilterLower)) return false
      return true
    })
    return shuffleSeed ? seededShuffle(items, shuffleSeed) : items
  }, [vocabularyItems, filter, dateFrom, dateTo, hasDateFilter, memoFilterLower, shuffleSeed])

  const filteredExpressions = useMemo(() => {
    const items = expressionItems.filter((item) => {
      if (filter === 'memorized' && !item.is_memorized) return false
      if (filter === 'not-memorized' && item.is_memorized) return false
      if (filter === 'needs-review' && !item.needs_review) return false
      if (hasDateFilter && item.added_at) {
        const addedDate = item.added_at.slice(0, 10)
        if (dateFrom && addedDate < dateFrom) return false
        if (dateTo && addedDate > dateTo) return false
      }
      if (memoFilterLower && !(item.memo || '').toLowerCase().includes(memoFilterLower)) return false
      return true
    })
    return shuffleSeed ? seededShuffle(items, shuffleSeed) : items
  }, [expressionItems, filter, dateFrom, dateTo, hasDateFilter, memoFilterLower, shuffleSeed])

  // 업로드 진행 목록: 단어별 최신 상태만 표시 (generating → added 중복 제거)
  const displayProgress = useMemo(() => {
    const map = new Map<string, BulkProgress>()
    uploadProgress.forEach(p => map.set(p.word, p))
    return [...map.values()]
  }, [uploadProgress])

  // 실제 완료 단어 수 (generating 제외한 terminal 상태만)
  const completedCount = useMemo(
    () => uploadProgress.filter(p => p.status !== 'generating').length,
    [uploadProgress]
  )

  const clearDateFilter = () => {
    setDateFrom('')
    setDateTo('')
  }

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">나만의 단어장을 만들어 보세요</h2>
          <p className="text-muted-foreground">
            로그인하면 검색한 단어를 단어장에 저장하고<br />
            암기 여부를 체크하며 학습할 수 있어요.
          </p>
          <Button asChild>
            <Link href="/auth/login">로그인하고 시작하기</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleDelete = (item: UserVocabulary) => {
    setPendingDelete(item)
  }

  const executeDelete = async (item: UserVocabulary) => {
    setPendingDelete(null)
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabularyId: item.id }),
      })
      if (res.ok) {
        toast({ title: '삭제 완료', description: 'Voca 리스트에서 제거되었습니다.' })
        refresh()
      }
    } catch {
      toast({ title: '오류', description: '삭제에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleDetail = (item: UserVocabulary) => {
    if (!item.word) return
    setDetailLoading(true)
    setDetailWord(null)
    setDetailExpression(null)
    setTimeout(() => {
      setDetailWord(item.word!)
      setDetailLoading(false)
    }, 800)
  }

  const handleExprDetail = (item: UserExpression) => {
    if (!item.expression) return
    setDetailLoading(true)
    setDetailWord(null)
    setDetailExpression(null)
    setTimeout(() => {
      setDetailExpression(item.expression!)
      setDetailLoading(false)
    }, 800)
  }

  const handleToggle = async (item: UserVocabulary) => {
    await toggleMemorized(item.id, !item.is_memorized)
    toast({
      title: item.is_memorized ? '미암기로 변경' : '암기 완료!',
      description: item.is_memorized
        ? `"${item.word?.word}"을(를) 미암기로 변경했습니다.`
        : `"${item.word?.word}"을(를) 암기 완료로 표시했습니다.`,
    })
  }

  const handleToggleReview = async (item: UserVocabulary) => {
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabularyId: item.id, needs_review: !item.needs_review }),
      })
      if (res.ok) {
        refresh()
        toast({
          title: item.needs_review ? '오답 해제' : '퀴즈 오답 표시',
          description: item.needs_review
            ? '오답 표시를 해제했습니다.'
            : '퀴즈 오답으로 표시했습니다.',
        })
      }
    } catch {
      toast({ title: '오류', description: '수정에 실패했습니다.', variant: 'destructive' })
    }
  }

  // --- Expression handlers ---
  const handleExprDelete = (item: UserExpression) => {
    setPendingExprDelete(item)
  }

  const executeExprDelete = async (item: UserExpression) => {
    setPendingExprDelete(null)
    try {
      const res = await fetch('/api/vocabulary/expressions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userExpressionId: item.id }),
      })
      if (res.ok) {
        toast({ title: '삭제 완료', description: 'Lenz 픽에서 제거되었습니다.' })
        refreshExpr()
      }
    } catch {
      toast({ title: '오류', description: '삭제에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleExprToggle = async (item: UserExpression) => {
    await toggleExprMemorized(item.id, !item.is_memorized)
    toast({
      title: item.is_memorized ? '미암기로 변경' : '암기 완료!',
      description: item.is_memorized
        ? `"${item.expression?.expression}"을(를) 미암기로 변경했습니다.`
        : `"${item.expression?.expression}"을(를) 암기 완료로 표시했습니다.`,
    })
  }

  const handleExprToggleReview = async (item: UserExpression) => {
    try {
      const res = await fetch('/api/vocabulary/expressions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userExpressionId: item.id, needs_review: !item.needs_review }),
      })
      if (res.ok) {
        refreshExpr()
        toast({
          title: item.needs_review ? '오답 해제' : '퀴즈 오답 표시',
          description: item.needs_review
            ? '오답 표시를 해제했습니다.'
            : '퀴즈 오답으로 표시했습니다.',
        })
      }
    } catch {
      toast({ title: '오류', description: '수정에 실패했습니다.', variant: 'destructive' })
    }
  }

  const toggleRetryItem = (idx: number) => {
    setRetryItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, selected: !item.selected } : item))
    )
  }

  const handleRetrySelected = () => {
    const selected = retryItems.filter((r) => r.selected)
    if (selected.length === 0) return
    const retryWords = selected.map((r) => ({ word: r.retryWord }))
    const forceWords = selected.filter((r) => r.type === 'force').map((r) => r.retryWord)
    setRetryItems([])
    setUploadResult(null)
    handleBulkUpload(retryWords, forceWords)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown as unknown[][]

      const englishRegex = /^[a-zA-Z\s\-,.!?']+$/
      const wordMap = new Map<string, string | undefined>()
      const excluded: string[] = []
      let isFirstNonEmpty = true

      for (const row of rows) {
        // Excel/Word 스마트 따옴표(U+2018, U+2019)를 ASCII 아포스트로피로 정규화
        const cell = String(row[0] || '').trim().replace(/[\u2018\u2019]/g, "'")
        if (!cell) continue
        // 첫 번째 비어있지 않은 행이 한국어/특수문자인 경우 헤더로 간주하여 무시
        if (isFirstNonEmpty && !englishRegex.test(cell)) {
          isFirstNonEmpty = false
          continue
        }
        isFirstNonEmpty = false
        if (englishRegex.test(cell)) {
          const wordKey = cell.toLowerCase()
          if (!wordMap.has(wordKey)) {
            const memoCell = row[1] != null ? String(row[1]).trim() : undefined
            wordMap.set(wordKey, memoCell || undefined)
          }
        } else {
          excluded.push(cell)
        }
      }

      if (wordMap.size === 0) {
        toast({ title: '오류', description: '영단어를 찾을 수 없습니다. A열에 영단어를 넣어주세요.', variant: 'destructive' })
        return
      }

      const allItems = Array.from(wordMap.entries()).map(([word, memo]) => ({ word, memo }))
      const limited = allItems.slice(0, 500)
      if (allItems.length > 500) {
        toast({ title: '안내', description: `500개를 초과하여 앞 500개만 처리합니다. (전체 ${allItems.length}개)` })
      }

      setParsedWords(limited)
      setFilteredOutItems(excluded)
      setShowExcluded(false)
      setUploadResult(null)
      setUploadProgress([])
    } catch {
      toast({ title: '오류', description: '파일을 읽을 수 없습니다.', variant: 'destructive' })
    }

    // reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleBulkUpload = async (
    overrideWords?: { word: string; memo?: string }[],
    skipGkFor?: string[]
  ) => {
    const words = overrideWords ?? parsedWords
    if (words.length === 0) return

    const remaining = 5000 - count - exprCount
    const listName = uploadTarget === 'word' ? 'Voca 리스트' : 'Lenz 픽'
    if (remaining <= 0) {
      toast({ title: '오류', description: `단어장이 가득 찼습니다. (합산 최대 5000개)`, variant: 'destructive' })
      return
    }

    const wordsToUpload = words.slice(0, remaining)
    setUploading(true)
    setUploadProgress([])
    setUploadResult(null)
    setUploadStalled(false)
    setUploadTotal(wordsToUpload.length)

    try {
      const res = await fetch('/api/vocabulary/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: wordsToUpload,
          uploadType: uploadTarget,
          ...(skipGkFor?.length ? { skipGatekeeperFor: skipGkFor } : {}),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast({ title: '오류', description: err.error, variant: 'destructive' })
        setUploading(false)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        setUploading(false)
        return
      }

      const readWithTimeout = () =>
        Promise.race<ReadableStreamReadResult<Uint8Array>>([
          reader.read(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('STALL_TIMEOUT')), 60000)
          ),
        ])

      let buffer = ''
      let refreshed = false
      const localFailed: BulkProgress[] = []

      while (true) {
        const result = await readWithTimeout().catch((e: Error) => {
          if (e.message === 'STALL_TIMEOUT') {
            setUploadStalled(true)
            reader.cancel().catch(() => {})
            return null
          }
          throw e
        })
        if (result === null) return

        const { done, value } = result
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === 'progress') {
              setUploadProgress((prev) => [...prev, data])
              if (data.status === 'failed') localFailed.push(data)
            } else if (data.type === 'complete') {
              setUploadResult(data)
              const retries = localFailed
                .filter((p) => p.gkStatus)
                .map((p) => ({
                  originalWord: p.word,
                  retryWord: p.correction || p.word,
                  type: (p.correction ? 'correction' : 'force') as 'correction' | 'force',
                  selected: true,
                }))
              setRetryItems(retries)
              if (!refreshed) {
                refreshed = true
                if (uploadTarget === 'word') refresh()
                else refreshExpr()
              }
            }
          } catch {
            // skip invalid JSON
          }
        }
      }

      // process remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer)
          if (data.type === 'complete') {
            setUploadResult(data)
            const retries = localFailed
              .filter((p) => p.gkStatus)
              .map((p) => ({
                originalWord: p.word,
                retryWord: p.correction || p.word,
                type: (p.correction ? 'correction' : 'force') as 'correction' | 'force',
                selected: true,
              }))
            setRetryItems(retries)
            if (!refreshed) {
              refreshed = true
              if (uploadTarget === 'word') refresh()
              else refreshExpr()
            }
          }
        } catch {
          // skip
        }
      }
    } catch {
      toast({ title: '오류', description: '업로드에 실패했습니다.', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    setParsedWords([])
    setFilteredOutItems([])
    setShowExcluded(false)
    setUploadProgress([])
    setUploadResult(null)
    setUploading(false)
    setUploadStalled(false)
    setRetryItems([])
    setUploadTotal(0)
  }

  const downloadCsvSample = () => {
    const isExpr = uploadTarget === 'expression'
    const header = '단어/구문,메모(선택)'
    const samples = isExpr
      ? ['pick up speed,test-5 청해', 'under the weather,test-4', 'beat around the bush,']
      : ['abandon,test-4 파트1', 'benevolent,test-3', 'diligent,']
    const csv = [header, ...samples].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = isExpr ? 'lenz_sample.csv' : 'voca_sample.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header: 좌측 제목+카운트, 우측 설정+Upload 아이콘 버튼 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">내 단어장</h1>
            <p className="text-sm mt-1">
              <span className={count + exprCount >= 4000 ? 'text-orange-500 font-medium' : 'text-muted-foreground'}>
                단어장 합산 {count + exprCount}/5000
              </span>
              <span className="text-muted-foreground">
                {' '}· {vocabTab === 'words' ? `Voca ${count}` : `Lenz ${exprCount}`}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setCustomizerOpen(true)}
              aria-label="카드 표시 설정"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => {
                resetUpload()
                setUploadTarget(vocabTab === 'words' ? 'word' : 'expression')
                setUploadOpen(true)
              }}
              aria-label="일괄 추가"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 카드 표시 설정 (controlled) */}
        <CardCustomizer
          open={customizerOpen}
          onOpenChange={setCustomizerOpen}
          initialTab={vocabTab === 'words' ? 'word' : 'expression'}
          hideTopSettings
        />

        {/* Voca 리스트 / Lenz 픽 탭 토글 */}
        <div className="inline-flex items-center rounded-xl bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setVocabTab('words')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              vocabTab === 'words'
                ? 'bg-primary/15 text-primary font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            {memoFilterLower
              ? `Voca (${filtered.length}/${count})`
              : `Voca 리스트 (${count})`}
          </button>
          <button
            type="button"
            onClick={() => setVocabTab('expressions')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              vocabTab === 'expressions'
                ? 'bg-primary/15 text-primary font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Headphones className="h-3.5 w-3.5 shrink-0" />
            {memoFilterLower
              ? `Lenz (${filteredExpressions.length}/${exprCount})`
              : `Lenz 픽 (${exprCount})`}
          </button>
        </div>

        {/* 메모 검색 + 셔플 한 행 */}
        <div className="flex items-center gap-2">
          <div className="relative w-44 min-w-0">
            <StickyNote className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 pointer-events-none" />
            <input
              type="text"
              value={memoFilter}
              onChange={(e) => setMemoFilter(e.target.value)}
              placeholder="메모로 검색"
              className="pl-8 pr-8 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400 w-full"
            />
            {memoFilter && (
              <button
                onClick={() => setMemoFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="메모 필터 지우기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            variant={shuffleSeed !== 0 ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => setShuffleSeed(shuffleSeed !== 0 ? 0 : Date.now())}
            title="섞기"
            aria-label="섞기"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>

        {/* 필터 버튼 행 */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'not-memorized', 'memorized', 'needs-review'] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '전체' : f === 'not-memorized' ? '미암기' : f === 'memorized' ? '암기완료' : '퀴즈오답'}
            </Button>
          ))}

          {/* 날짜 필터 */}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={hasDateFilter ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
              >
                {hasDateFilter
                  ? dateFrom && dateTo
                    ? `${dateFrom} ~ ${dateTo}`
                    : dateFrom
                      ? `${dateFrom}~`
                      : `~${dateTo}`
                  : '날짜'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="space-y-3">
                <p className="text-sm font-medium">날짜 필터</p>
                <div className="flex items-center gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">시작일</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                  <span className="text-muted-foreground pt-5">~</span>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">종료일</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10)
                      setDateFrom(today)
                      setDateTo(today)
                    }}
                  >
                    오늘
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const today = new Date()
                      const weekAgo = new Date(today.getTime() - 7 * 86400000)
                      setDateFrom(weekAgo.toISOString().slice(0, 10))
                      setDateTo(today.toISOString().slice(0, 10))
                    }}
                  >
                    최근 7일
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const today = new Date()
                      const monthAgo = new Date(today.getTime() - 30 * 86400000)
                      setDateFrom(monthAgo.toISOString().slice(0, 10))
                      setDateTo(today.toISOString().slice(0, 10))
                    }}
                  >
                    최근 30일
                  </Button>
                </div>
                {hasDateFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => { clearDateFilter(); setDatePopoverOpen(false) }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    날짜 필터 해제
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Content */}
        {vocabTab === 'words' ? (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[180px] bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Star className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                {filter !== 'all'
                  ? '해당 필터에 맞는 단어가 없습니다.'
                  : 'Voca 리스트에 추가한 단어가 없습니다.'}
              </p>
              {filter === 'all' && (
                <p className="text-sm text-muted-foreground">
                  &ldquo;단어&rdquo; 모드로 검색 후 자동 저장되거나, 일괄 업로드를 이용하세요.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((item) => (
                <VocabularyFlipCard
                  key={item.id}
                  item={item}
                  isFlipped={flippedCards.has(item.id)}
                  onFlip={() => toggleFlip(item.id)}
                  onDetail={handleDetail}
                  onToggleMemorized={handleToggle}
                  onToggleReview={handleToggleReview}
                  onDelete={handleDelete}
                  onMemoUpdate={updateMemo}
                />
              ))}
            </div>
          )
        ) : (
          exprLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[180px] bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredExpressions.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Star className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                {filter !== 'all'
                  ? '해당 필터에 맞는 구문이 없습니다.'
                  : 'Lenz 픽에 추가한 청해 구문이 없습니다.'}
              </p>
              {filter === 'all' && (
                <p className="text-sm text-muted-foreground">
                  &ldquo;청해 구문&rdquo; 모드로 검색 후 자동 저장되거나, 일괄 업로드를 이용하세요.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredExpressions.map((item) => (
                <ExpressionFlipCard
                  key={item.id}
                  item={item}
                  isFlipped={flippedCards.has(item.id)}
                  onFlip={() => toggleFlip(item.id)}
                  onDetail={handleExprDetail}
                  onToggleMemorized={handleExprToggle}
                  onToggleReview={handleExprToggleReview}
                  onDelete={handleExprDelete}
                  onMemoUpdate={updateExprMemo}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* 하단 검색 FAB */}
      <button
        onClick={() => router.push('/')}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
        aria-label="단어 검색"
      >
        <Search className="h-6 w-6" />
      </button>

      {/* 상세 보기 다이얼로그 */}
      <Dialog
        open={detailLoading || detailWord !== null || detailExpression !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailWord(null)
            setDetailExpression(null)
            setDetailLoading(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailExpression ? 'Lenz 픽 상세' : '단어 상세'}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <DetailLoading />
          ) : detailWord ? (
            <WordCard word={detailWord} showVocabularyButton={false} />
          ) : detailExpression ? (
            <ExpressionCard expression={detailExpression} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 일괄 추가 다이얼로그 */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!open && !uploading) { setUploadOpen(false); resetUpload() } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>일괄 추가</DialogTitle>
          </DialogHeader>

          {/* 목적지 선택 토글 (업로드 중이 아닐 때) */}
          {!uploading && !uploadResult && (
            <div className="flex items-center rounded-xl bg-muted p-0.5 mb-1">
              <button
                type="button"
                onClick={() => setUploadTarget('word')}
                className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  uploadTarget === 'word'
                    ? 'bg-primary/15 text-primary font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Voca 리스트
              </button>
              <button
                type="button"
                onClick={() => setUploadTarget('expression')}
                className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  uploadTarget === 'expression'
                    ? 'bg-primary/15 text-primary font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Headphones className="h-3.5 w-3.5" />
                Lenz 픽
              </button>
            </div>
          )}

          {uploadResult ? (
            // 완료 결과
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <CheckCircleIcon className="h-12 w-12 mx-auto text-green-500" />
                <h3 className="text-lg font-semibold">업로드 완료!</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>추가됨: {uploadResult.added}개</p>
                  {uploadResult.skipped > 0 && <p>이미 있음: {uploadResult.skipped}개</p>}
                  {uploadResult.failed > 0 && <p>실패: {uploadResult.failed}개</p>}
                </div>
              </div>

              {retryItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-0.5">
                    재시도 가능한 항목 ({retryItems.length}개) — 클릭하여 선택/해제
                  </p>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {retryItems.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleRetryItem(idx)}
                        className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                          item.selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border bg-muted/30 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            item.selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                          }`}>
                            {item.selected && (
                              <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {item.type === 'correction' ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-mono text-muted-foreground line-through">{item.originalWord}</span>
                                <span className="text-xs text-muted-foreground">→</span>
                                <span className="text-xs font-mono font-semibold text-foreground">{item.retryWord}</span>
                              </div>
                            ) : (
                              <span className="text-xs font-mono font-semibold text-foreground">{item.originalWord}</span>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {item.type === 'correction' ? '철자 수정 후 등록' : '그대로 등록'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleRetrySelected}
                    disabled={retryItems.every((r) => !r.selected)}
                  >
                    선택한 {retryItems.filter((r) => r.selected).length}개 등록
                  </Button>
                </div>
              )}

              <Button
                variant={retryItems.length > 0 ? 'outline' : 'default'}
                className="w-full"
                onClick={() => { setUploadOpen(false); resetUpload() }}
              >
                완료
              </Button>
            </div>
          ) : uploadStalled ? (
            // 스트림 스탈 UI
            <div className="space-y-4">
              <div className="text-center space-y-3">
                <AlertCircle className="h-10 w-10 mx-auto text-orange-500" />
                <h3 className="text-base font-semibold">업로드가 멈춘 것 같아요</h3>
                <p className="text-sm text-muted-foreground">
                  1분 이상 응답이 없어 자동으로 중단했습니다.<br />
                  이미 처리된 항목은 단어장에 저장되었을 수 있어요.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setUploadOpen(false); resetUpload() }}
                >
                  닫기
                </Button>
                <Button className="flex-1" onClick={() => handleBulkUpload()}>
                  다시 시도
                </Button>
              </div>
            </div>
          ) : uploading ? (
            // 진행 중
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  {uploadTotal}개 항목을 {uploadTarget === 'word' ? 'Voca 리스트' : 'Lenz 픽'}에 추가하고 있어요.
                </p>
              </div>
              {uploadProgress.length > 0 && (
                <>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${uploadTotal > 0 ? Math.min((completedCount / uploadTotal) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {displayProgress.map((p) => (
                      <div key={p.word} className="flex items-start gap-2 text-sm min-w-0">
                        <span className="shrink-0 mt-0.5">
                          {p.status === 'added' ? '✅' :
                           p.status === 'skipped' ? '⏭️' :
                           p.status === 'generating' ? '🔄' :
                           p.status === 'failed' ? '❌' : '⏳'}
                        </span>
                        <span className="font-mono shrink-0">{p.word}</span>
                        <span className="text-xs text-muted-foreground flex-1 min-w-0 break-words">
                          {p.status === 'added' ? '추가 완료' :
                           p.status === 'skipped' ? `이미 ${uploadTarget === 'word' ? 'Voca 리스트' : 'Lenz 픽'}에 있음` :
                           p.status === 'generating' ? '생성 중...' :
                           p.status === 'failed' ? (
                             p.correction
                               ? `${p.error} → 올바른 철자: ${p.correction}`
                               : p.error
                           ) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : parsedWords.length > 0 ? (
            // 파싱 결과 확인
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>{parsedWords.length}개 영단어/구문을 찾았습니다.</p>
                {filteredOutItems.length > 0 && (
                  <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowExcluded((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <span className="flex-1 text-orange-600 dark:text-orange-400 text-xs font-medium">
                        {filteredOutItems.length}개 항목이 제외되었습니다
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-orange-400 shrink-0 transition-transform duration-200 ${showExcluded ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {showExcluded && (
                      <div className="px-3 pb-3 pt-1 border-t border-orange-200 dark:border-orange-800">
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {filteredOutItems.map((item, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs font-mono"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {(5000 - count - exprCount) < parsedWords.length && (
                  <p className="text-orange-500">
                    단어장 합산 잔여 용량({5000 - count - exprCount}개)만큼만 추가됩니다.
                  </p>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md p-3">
                <div className="flex flex-wrap gap-2">
                  {parsedWords.map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-muted rounded text-sm font-mono">
                      {item.word}{item.memo ? <span className="text-amber-600 dark:text-amber-400"> ({item.memo})</span> : null}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={resetUpload}>
                  다시 선택
                </Button>
                <Button className="flex-1" onClick={() => handleBulkUpload()}>
                  {uploadTarget === 'word' ? 'Voca 리스트에 추가' : 'Lenz 픽에 추가'}
                </Button>
              </div>
            </div>
          ) : (
            // 파일 선택
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  A열: 영단어/구문, B열: 메모 (선택). 최대 500개.
                </p>
                <button
                  type="button"
                  onClick={downloadCsvSample}
                  className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                >
                  <Download className="h-3 w-3" />
                  샘플 양식
                </button>
              </div>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">파일을 선택하세요</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  파일 선택
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                iOS Safari: 파일 앱에서 CSV를 선택하거나, PC에서 다운받아 업로드하세요.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 단어 삭제 확인 */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>단어 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">&ldquo;{pendingDelete?.word?.word}&rdquo;</span>을(를){' '}
            Voca 리스트에서 삭제할까요?<br />
            이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPendingDelete(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => pendingDelete && executeDelete(pendingDelete)}
            >
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 청해구문 삭제 확인 */}
      <Dialog open={pendingExprDelete !== null} onOpenChange={(open) => { if (!open) setPendingExprDelete(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>구문 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">&ldquo;{pendingExprDelete?.expression?.expression}&rdquo;</span>을(를){' '}
            Lenz 픽에서 삭제할까요?<br />
            이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPendingExprDelete(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => pendingExprDelete && executeExprDelete(pendingExprDelete)}
            >
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function DetailLoading() {
  const [phrase, setPhrase] = useState<LoadingPhrase>(getRandomPhrase)

  useEffect(() => {
    const interval = setInterval(() => {
      setPhrase(getRandomPhrase())
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="py-8 space-y-4">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">단어 정보를 불러오는 중...</span>
      </div>
      <div className="bg-accent/50 rounded-lg p-4 text-center space-y-1.5">
        <p className="text-xs text-muted-foreground">잠시만요! 이 표현도 알아두세요</p>
        <p className="text-sm font-medium text-foreground">{phrase.en}</p>
        <p className="text-xs text-muted-foreground">{phrase.ko}</p>
      </div>
    </div>
  )
}
