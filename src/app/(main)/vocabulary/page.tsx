'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Star, Loader2, Upload, Search, Calendar, X } from 'lucide-react'
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

type VocabTab = 'words' | 'expressions'

export default function VocabularyPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { vocabularyItems, count, loading, toggleMemorized, refresh } = useVocabulary()
  const { expressionItems, count: exprCount, loading: exprLoading, toggleMemorized: toggleExprMemorized, refresh: refreshExpr } = useExpressionVocabulary()
  const [vocabTab, setVocabTab] = useState<VocabTab>('words')
  const [filter, setFilter] = useState<FilterType>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [detailWord, setDetailWord] = useState<Word | null>(null)
  const [detailExpression, setDetailExpression] = useState<Expression | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())

  // 업로드 상태
  const [uploadOpen, setUploadOpen] = useState(false)
  const [parsedWords, setParsedWords] = useState<string[]>([])
  const [filteredOutCount, setFilteredOutCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<BulkProgress[]>([])
  const [uploadResult, setUploadResult] = useState<BulkComplete | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const filtered = useMemo(() => {
    return vocabularyItems.filter((item) => {
      // 상태 필터
      if (filter === 'memorized' && !item.is_memorized) return false
      if (filter === 'not-memorized' && item.is_memorized) return false
      if (filter === 'needs-review' && !item.needs_review) return false

      // 날짜 필터
      if (hasDateFilter && item.added_at) {
        const addedDate = item.added_at.slice(0, 10) // YYYY-MM-DD
        if (dateFrom && addedDate < dateFrom) return false
        if (dateTo && addedDate > dateTo) return false
      }

      return true
    })
  }, [vocabularyItems, filter, dateFrom, dateTo, hasDateFilter])

  const filteredExpressions = useMemo(() => {
    return expressionItems.filter((item) => {
      if (filter === 'memorized' && !item.is_memorized) return false
      if (filter === 'not-memorized' && item.is_memorized) return false
      if (filter === 'needs-review' && !item.needs_review) return false
      if (hasDateFilter && item.added_at) {
        const addedDate = item.added_at.slice(0, 10)
        if (dateFrom && addedDate < dateFrom) return false
        if (dateTo && addedDate > dateTo) return false
      }
      return true
    })
  }, [expressionItems, filter, dateFrom, dateTo, hasDateFilter])

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

  const handleDelete = async (item: UserVocabulary) => {
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabularyId: item.id }),
      })
      if (res.ok) {
        toast({ title: '삭제 완료', description: '단어장에서 제거되었습니다.' })
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
          title: item.needs_review ? '복습 해제' : '복습 표시',
          description: item.needs_review
            ? '복습 표시를 해제했습니다.'
            : '복습 필요로 표시했습니다.',
        })
      }
    } catch {
      toast({ title: '오류', description: '수정에 실패했습니다.', variant: 'destructive' })
    }
  }

  // --- Expression handlers ---
  const handleExprDelete = async (item: UserExpression) => {
    try {
      const res = await fetch('/api/vocabulary/expressions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userExpressionId: item.id }),
      })
      if (res.ok) {
        toast({ title: '삭제 완료', description: '표현 단어장에서 제거되었습니다.' })
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
          title: item.needs_review ? '복습 해제' : '복습 표시',
          description: item.needs_review
            ? '복습 표시를 해제했습니다.'
            : '복습 필요로 표시했습니다.',
        })
      }
    } catch {
      toast({ title: '오류', description: '수정에 실패했습니다.', variant: 'destructive' })
    }
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

      const englishRegex = /^[a-zA-Z\s\-]+$/
      const allWords: string[] = []
      let nonEnglish = 0

      for (const row of rows) {
        const cell = String(row[0] || '').trim()
        if (!cell) continue
        if (englishRegex.test(cell)) {
          allWords.push(cell.toLowerCase())
        } else {
          nonEnglish++
        }
      }

      if (allWords.length === 0) {
        toast({ title: '오류', description: '영단어를 찾을 수 없습니다. A열에 영단어를 넣어주세요.', variant: 'destructive' })
        return
      }

      const uniqueWords = [...new Set(allWords)]
      const limited = uniqueWords.slice(0, 50)
      if (uniqueWords.length > 50) {
        toast({ title: '안내', description: `50개를 초과하여 앞 50개만 처리합니다. (전체 ${uniqueWords.length}개)` })
      }

      setParsedWords(limited)
      setFilteredOutCount(nonEnglish)
      setUploadResult(null)
      setUploadProgress([])
    } catch {
      toast({ title: '오류', description: '파일을 읽을 수 없습니다.', variant: 'destructive' })
    }

    // reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleBulkUpload = async () => {
    if (parsedWords.length === 0) return

    const remaining = 100 - count
    if (remaining <= 0) {
      toast({ title: '오류', description: '단어장이 가득 찼습니다.', variant: 'destructive' })
      return
    }

    const wordsToUpload = parsedWords.slice(0, remaining)
    setUploading(true)
    setUploadProgress([])
    setUploadResult(null)

    try {
      const res = await fetch('/api/vocabulary/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsToUpload }),
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

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
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
            } else if (data.type === 'complete') {
              setUploadResult(data)
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
          }
        } catch {
          // skip
        }
      }

      refresh()
    } catch {
      toast({ title: '오류', description: '업로드에 실패했습니다.', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    setParsedWords([])
    setFilteredOutCount(0)
    setUploadProgress([])
    setUploadResult(null)
    setUploading(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header: 좌측 제목+카운트, 우측 Upload 아이콘 버튼 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">내 단어장</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {vocabTab === 'words' ? `${count}/100 단어` : `${exprCount}/100 표현`}
            </p>
          </div>
          {vocabTab === 'words' && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => { resetUpload(); setUploadOpen(true) }}
              aria-label="단어 일괄 추가"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 단어/표현 탭 토글 */}
        <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setVocabTab('words')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              vocabTab === 'words'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            단어 ({count})
          </button>
          <button
            type="button"
            onClick={() => setVocabTab('expressions')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              vocabTab === 'expressions'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            표현 ({exprCount})
          </button>
        </div>

        {/* 필터 버튼 별도 행 */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'not-memorized', 'memorized', 'needs-review'] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '전체' : f === 'not-memorized' ? '미암기' : f === 'memorized' ? '암기완료' : '복습필요'}
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
                <Calendar className="h-3.5 w-3.5" />
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
                  : '아직 단어장에 추가한 단어가 없습니다.'}
              </p>
              {filter === 'all' && (
                <p className="text-sm text-muted-foreground">
                  검색 결과에서 버튼을 눌러 단어를 추가하세요.
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
                  ? '해당 필터에 맞는 표현이 없습니다.'
                  : '아직 단어장에 추가한 표현이 없습니다.'}
              </p>
              {filter === 'all' && (
                <p className="text-sm text-muted-foreground">
                  검색 탭에서 &ldquo;표현&rdquo; 모드로 검색 후 추가하세요.
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
            <DialogTitle>{detailExpression ? '표현 상세' : '단어 상세'}</DialogTitle>
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

      {/* 단어 일괄 추가 다이얼로그 */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!open && !uploading) { setUploadOpen(false); resetUpload() } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>단어 일괄 추가</DialogTitle>
          </DialogHeader>

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
              <Button className="w-full" onClick={() => { setUploadOpen(false); resetUpload() }}>
                확인
              </Button>
            </div>
          ) : uploading ? (
            // 진행 중
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  {parsedWords.length}개의 단어를 추가하고 있어요. 조금만 기다려 주세요!
                </p>
              </div>
              {uploadProgress.length > 0 && (
                <>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.length / parsedWords.length) * 100}%` }}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {uploadProgress.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="shrink-0">
                          {p.status === 'added' ? '✅' :
                           p.status === 'skipped' ? '⏭️' :
                           p.status === 'generating' ? '🔄' :
                           p.status === 'failed' ? '❌' : '⏳'}
                        </span>
                        <span className="font-mono shrink-0">{p.word}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {p.status === 'added' ? '추가 완료' :
                           p.status === 'skipped' ? '이미 단어장에 있음' :
                           p.status === 'generating' ? '생성 중...' :
                           p.status === 'failed' ? (
                             p.correction
                               ? `${p.error} → ${p.correction}`
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
              <div className="text-sm text-muted-foreground">
                <p>{parsedWords.length}개 영단어를 찾았습니다.</p>
                {filteredOutCount > 0 && (
                  <p className="text-orange-500">{filteredOutCount}개 비영어 항목은 제외되었습니다.</p>
                )}
                {100 - count < parsedWords.length && (
                  <p className="text-orange-500">
                    단어장 잔여 용량({100 - count}개)만큼만 추가됩니다.
                  </p>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md p-3">
                <div className="flex flex-wrap gap-2">
                  {parsedWords.map((w, i) => (
                    <span key={i} className="px-2 py-1 bg-muted rounded text-sm font-mono">{w}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={resetUpload}>
                  다시 선택
                </Button>
                <Button className="flex-1" onClick={handleBulkUpload}>
                  추가하기
                </Button>
              </div>
            </div>
          ) : (
            // 파일 선택
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Excel 또는 CSV 파일의 A열에 영단어를 넣어주세요. (최대 50개)
              </p>
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
            </div>
          )}
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
