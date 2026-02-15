'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { BookOpen, Check, Trash2, Star, Eye, Loader2, Upload, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthContext } from '@/components/providers/auth-provider'
import { useVocabulary } from '@/hooks/use-vocabulary'
import { toast } from '@/hooks/use-toast'
import { WordCard } from '@/components/search/word-card'
import { getRandomPhrase, type LoadingPhrase } from '@/lib/loading-phrases'
import type { UserVocabulary, Word } from '@/types/database'

type FilterType = 'all' | 'not-memorized' | 'memorized' | 'needs-review'

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Essential', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  2: { label: 'Core', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  3: { label: 'Advanced', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  4: { label: 'Killer', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

interface BulkProgress {
  current: number
  total: number
  word: string
  status: string
  error?: string
}

interface BulkComplete {
  added: number
  skipped: number
  failed: number
}

export default function VocabularyPage() {
  const { user, loading: authLoading } = useAuthContext()
  const { vocabularyItems, count, loading, toggleMemorized, refresh } = useVocabulary()
  const [filter, setFilter] = useState<FilterType>('all')
  const [detailWord, setDetailWord] = useState<Word | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 업로드 상태
  const [uploadOpen, setUploadOpen] = useState(false)
  const [parsedWords, setParsedWords] = useState<string[]>([])
  const [filteredOutCount, setFilteredOutCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<BulkProgress[]>([])
  const [uploadResult, setUploadResult] = useState<BulkComplete | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const filtered = vocabularyItems.filter((item) => {
    if (filter === 'memorized') return item.is_memorized
    if (filter === 'not-memorized') return !item.is_memorized
    if (filter === 'needs-review') return item.needs_review
    return true
  })

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

  const handleDetail = (word: Word) => {
    setDetailLoading(true)
    setDetailWord(null)
    setTimeout(() => {
      setDetailWord(word)
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
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">내 단어장</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {count}/100 단어
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { resetUpload(); setUploadOpen(true) }}
            >
              <Upload className="h-4 w-4 mr-1" />
              단어 일괄 추가
            </Button>
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
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => {
              const word = item.word
              if (!word) return null
              const levelConfig = LEVEL_CONFIG[word.difficulty_level] || LEVEL_CONFIG[2]

              return (
                <Card
                  key={item.id}
                  className={`transition-colors ${
                    item.is_memorized ? 'opacity-60' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-bold truncate">{word.word}</h3>
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${levelConfig.color}`}
                          >
                            Lv.{word.difficulty_level}
                          </span>
                          {word.part_of_speech &&
                            word.part_of_speech.split('/').map((pos, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {pos.trim()}
                              </Badge>
                            ))}
                          {item.needs_review && (
                            <button
                              onClick={() => handleToggleReview(item)}
                              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/60 cursor-pointer transition-colors"
                              title="클릭하여 복습 해제"
                            >
                              복습
                            </button>
                          )}
                        </div>
                        {word.pronunciation && (
                          <p className="text-xs text-muted-foreground mb-1.5">
                            [{word.pronunciation}]
                          </p>
                        )}
                        <div className="space-y-0.5">
                          {word.meanings.slice(0, 2).map((m, i) => (
                            <p key={i} className="text-sm text-foreground truncate">
                              {i + 1}. {m}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDetail(word)}
                          aria-label="상세 보기"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(item)}
                          aria-label={item.is_memorized ? '미암기로 변경' : '암기 완료'}
                        >
                          <Check
                            className={`h-4 w-4 ${
                              item.is_memorized
                                ? 'text-green-500'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item)}
                          aria-label="단어장에서 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 상세 보기 다이얼로그 */}
      <Dialog
        open={detailLoading || detailWord !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailWord(null)
            setDetailLoading(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>단어 상세</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <DetailLoading />
          ) : detailWord ? (
            <WordCard word={detailWord} showVocabularyButton={false} />
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
                        <span>
                          {p.status === 'exists' || p.status === 'created' ? '✅' :
                           p.status === 'skipped' ? '⏭️' :
                           p.status === 'generating' ? '🔄' :
                           p.status === 'failed' ? '❌' : '⏳'}
                        </span>
                        <span className="font-mono">{p.word}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.status === 'exists' ? 'DB에서 추가' :
                           p.status === 'created' ? '새로 생성' :
                           p.status === 'skipped' ? '이미 단어장에 있음' :
                           p.status === 'generating' ? '생성 중...' :
                           p.status === 'failed' ? p.error : ''}
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
