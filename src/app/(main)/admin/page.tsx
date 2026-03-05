'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Trash2, Save, Loader2, Users, BookOpen,
  BarChart3, CheckCircle2, ChevronLeft, ChevronRight, ArrowRight,
  Upload, Download, FileText, AlertCircle, X, Wand2, Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAuthContext } from '@/components/providers/auth-provider'
import { toast } from '@/hooks/use-toast'
import type { Word } from '@/types/database'

// ─── CSV 파싱 유틸 ───────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    // 따옴표 안의 쉼표 처리
    const cols: string[] = []
    let cur = ''
    let inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    cols.push(cur.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
    return row
  })
}

const CSV_TEMPLATE_HEADERS = [
  'word', 'part_of_speech', 'pronunciation', 'meanings',
  'description', 'description_en', 'image_text', 'teps_point',
  'synonyms', 'antonyms', 'comparisons', 'paraphrasing',
  'example_sentence', 'example_translation', 'difficulty_level',
]

const CSV_TEMPLATE_EXAMPLE = [
  'exacerbate', 'v.', '/ɪɡˈzæsərbeɪt/', '악화시키다;심화시키다',
  '이미 나쁜 상황을 더 심하게 만들다', 'to make a bad situation worse', '끓는 불에 기름을 붓다',
  'TEPS 빈출 고난도 동사', 'aggravate;worsen', 'alleviate;mitigate', '', '',
  'His actions exacerbated the situation.', '그의 행동이 상황을 악화시켰다.', '3',
]

function downloadTemplate() {
  const header = CSV_TEMPLATE_HEADERS.join(',')
  const example = CSV_TEMPLATE_EXAMPLE.map((v) => v.includes(',') ? `"${v}"` : v).join(',')
  const note = '# 배열 필드(meanings/synonyms/antonyms/comparisons/paraphrasing)는 세미콜론(;)으로 구분'
  const blob = new Blob([note + '\n' + header + '\n' + example], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'words_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── 업로드 미리보기 행 타입 ─────────────────────────────────────
interface PreviewRow {
  data: Record<string, string>
  status: 'valid' | 'error'
  errorMsg?: string
}

// --- Dashboard ---
interface DashboardStats {
  totalUsers: number
  totalWords: number
  todaySearches: number
  newUsersToday: number
  recentSearches: { word: string; searched_at: string }[]
}

function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => toast({ title: '대시보드 로드 실패', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  if (!stats) return null

  const cards = [
    { label: '전체 사용자', value: stats.totalUsers, icon: Users },
    { label: '등록 단어', value: stats.totalWords, icon: BookOpen },
    { label: '오늘 검색', value: stats.todaySearches, icon: Search },
    { label: '오늘 신규', value: stats.newUsersToday, icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{c.label}</span>
                </div>
                <p className="text-2xl font-bold">{c.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 검색어</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.recentSearches.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-sm">
                {s.word}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Word Management ---
function WordsTab() {
  const [query, setQuery] = useState('')
  const [words, setWords] = useState<Word[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [editingWord, setEditingWord] = useState<Word | null>(null)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [regenHint, setRegenHint] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  // ── CSV 업로드 상태 ──
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [onDuplicate, setOnDuplicate] = useState<'skip' | 'update'>('skip')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ inserted: number; updated: number; skipped: number; errors: { word: string; reason: string }[] } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({ title: 'CSV 파일만 업로드할 수 있습니다.', variant: 'destructive' })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      if (rows.length === 0) {
        toast({ title: 'CSV 파일에 데이터가 없습니다.', variant: 'destructive' })
        return
      }
      const preview: PreviewRow[] = rows.map((row) => {
        if (!row.word?.trim()) return { data: row, status: 'error', errorMsg: 'word 필드 필수' }
        if (!row.meanings?.trim()) return { data: row, status: 'error', errorMsg: 'meanings 필드 필수' }
        return { data: row, status: 'valid' }
      })
      setPreviewRows(preview)
      setUploadResult(null)
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleUpload = async () => {
    const validRows = previewRows.filter((r) => r.status === 'valid').map((r) => r.data)
    if (validRows.length === 0) return
    setUploading(true)
    try {
      const res = await fetch('/api/admin/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: validRows, onDuplicate }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast({ title: result.error || '업로드 실패', variant: 'destructive' })
        return
      }
      setUploadResult(result)
      fetchWords(query, page)
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    setPreviewRows([])
    setUploadResult(null)
    setOnDuplicate('skip')
  }

  const fetchWords = useCallback(async (q: string, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (q) params.set('q', q)
      const res = await fetch(`/api/admin/words?${params}`)
      const data = await res.json()
      setWords(data.words || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      toast({ title: '단어 로드 실패', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWords(query, page)
  }, [page, fetchWords]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPage(1)
    fetchWords(query, 1)
  }

  const handleEdit = (word: Word) => {
    setEditingWord(word)
    setEditForm({
      word: word.word,
      part_of_speech: word.part_of_speech || '',
      pronunciation: word.pronunciation || '',
      meanings: (word.meanings || []).join(', '),
      description: word.description || '',
      description_en: word.description_en || '',
      teps_point: word.teps_point || '',
      synonyms: (word.synonyms || []).join(', '),
      antonyms: (word.antonyms || []).join(', '),
      example_sentence: word.example_sentence || '',
      example_translation: word.example_translation || '',
      difficulty_level: word.difficulty_level,
    })
  }

  const handleSave = async () => {
    if (!editingWord) return
    setSaving(true)
    try {
      const updates = {
        id: editingWord.id,
        word: editForm.word,
        part_of_speech: editForm.part_of_speech || null,
        pronunciation: editForm.pronunciation || null,
        meanings: String(editForm.meanings || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        description: editForm.description || null,
        description_en: editForm.description_en || null,
        teps_point: editForm.teps_point || null,
        synonyms: String(editForm.synonyms || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        antonyms: String(editForm.antonyms || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        example_sentence: editForm.example_sentence || null,
        example_translation: editForm.example_translation || null,
        difficulty_level: Number(editForm.difficulty_level) || 1,
      }
      const res = await fetch('/api/admin/words', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        toast({ title: '단어가 수정되었습니다.' })
        setEditingWord(null)
        fetchWords(query, page)
      } else {
        toast({ title: '수정 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (word: Word) => {
    if (!confirm(`"${word.word}" 단어를 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/admin/words?id=${word.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '단어가 삭제되었습니다.' })
        fetchWords(query, page)
      } else {
        toast({ title: '삭제 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    }
  }

  const handleRegen = async () => {
    if (!editingWord || !regenHint.trim()) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/admin/words/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingWord.id, type: 'word', hint: regenHint.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'AI 재생성 실패', description: data.error || '', variant: 'destructive' })
        return
      }
      setEditForm((prev) => ({
        ...prev,
        meanings: (data.meanings || []).join(', '),
        description: data.description || '',
        description_en: data.description_en || '',
        teps_point: data.teps_point || '',
        synonyms: (data.synonyms || []).join(', '),
        antonyms: (data.antonyms || []).join(', '),
        example_sentence: data.example_sentence || '',
        example_translation: data.example_translation || '',
        difficulty_level: data.difficulty_level ?? prev.difficulty_level,
      }))
      setRegenHint('')
      toast({ title: 'AI 재생성 완료', description: '내용을 확인 후 저장해 주세요.' })
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 검색 + 업로드 버튼 */}
      <div className="flex gap-2">
        <Input
          placeholder="단어 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} size="icon" variant="secondary">
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="gap-1.5 shrink-0"
          onClick={() => { resetUpload(); setUploadOpen(true) }}
        >
          <Upload className="h-4 w-4" />
          CSV 업로드
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">총 {total.toLocaleString()}개</p>

      {/* CSV 업로드 Sheet */}
      <Sheet open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) resetUpload() }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              단어 CSV 일괄 업로드
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* 템플릿 다운로드 */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">CSV 템플릿</p>
                <p className="text-xs text-muted-foreground mt-0.5">배열 필드는 세미콜론(;)으로 구분 · 최대 500행</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" />
                템플릿 다운로드
              </Button>
            </div>

            {/* 드래그 앤 드롭 영역 */}
            {previewRows.length === 0 && !uploadResult && (
              <div
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">CSV 파일을 드래그하거나 클릭하여 선택</p>
                <p className="text-xs text-muted-foreground mt-1">UTF-8 인코딩 권장</p>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </div>
            )}

            {/* 업로드 결과 */}
            {uploadResult && (
              <div className="rounded-xl border bg-background overflow-hidden">
                <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between">
                  <p className="text-sm font-semibold">업로드 완료</p>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetUpload}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    초기화
                  </Button>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-3">
                  {[
                    { label: '추가됨', value: uploadResult.inserted, color: 'text-green-600 dark:text-green-400' },
                    { label: '수정됨', value: uploadResult.updated, color: 'text-blue-600 dark:text-blue-400' },
                    { label: '건너뜀', value: uploadResult.skipped, color: 'text-muted-foreground' },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
                {uploadResult.errors.length > 0 && (
                  <div className="border-t px-4 py-3 space-y-1.5">
                    <p className="text-xs font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      오류 {uploadResult.errors.length}건
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {uploadResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{e.word}</span>: {e.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 미리보기 테이블 */}
            {previewRows.length > 0 && !uploadResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    미리보기{' '}
                    <span className="text-muted-foreground font-normal">
                      (총 {previewRows.length}행 · 유효 {previewRows.filter((r) => r.status === 'valid').length} / 오류 {previewRows.filter((r) => r.status === 'error').length})
                    </span>
                  </p>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={resetUpload}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    파일 변경
                  </Button>
                </div>

                {/* 중복 처리 옵션 */}
                <div className="flex items-center gap-3 rounded-lg border px-4 py-2.5 bg-muted/30">
                  <p className="text-xs font-medium text-foreground shrink-0">중복 단어 처리:</p>
                  <div className="flex gap-2">
                    {(['skip', 'update'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOnDuplicate(opt)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          onDuplicate === opt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {opt === 'skip' ? '건너뜀' : '덮어쓰기'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 행 목록 */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="max-h-72 overflow-y-auto divide-y">
                    {previewRows.map((row, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 px-4 py-2.5 ${
                          row.status === 'error' ? 'bg-destructive/5' : 'bg-background'
                        }`}
                      >
                        <span className="text-xs text-muted-foreground w-6 shrink-0 pt-0.5">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{row.data.word || '—'}</span>
                            {row.data.difficulty_level && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Lv.{row.data.difficulty_level}
                              </Badge>
                            )}
                            {row.data.part_of_speech && (
                              <span className="text-xs text-muted-foreground">{row.data.part_of_speech}</span>
                            )}
                          </div>
                          {row.status === 'error' ? (
                            <p className="text-xs text-destructive mt-0.5 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {row.errorMsg}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {row.data.meanings?.replace(/;/g, ', ')}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {row.status === 'valid'
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : <AlertCircle className="h-4 w-4 text-destructive" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 업로드 버튼 */}
                <Button
                  className="w-full"
                  disabled={uploading || previewRows.filter((r) => r.status === 'valid').length === 0}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />업로드 중...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />
                      {previewRows.filter((r) => r.status === 'valid').length}개 단어 업로드
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {words.map((w) => (
            <Card key={w.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleEdit(w)}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{w.word}</span>
                    {w.part_of_speech && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {w.part_of_speech}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Lv.{w.difficulty_level}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {(w.meanings || []).join(', ')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleDelete(w) }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingWord} onOpenChange={(open) => !open && setEditingWord(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>단어 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: 'word', label: '단어' },
              { key: 'part_of_speech', label: '품사' },
              { key: 'pronunciation', label: '발음' },
              { key: 'meanings', label: '뜻 (쉼표 구분)' },
              { key: 'description', label: '한국어 설명' },
              { key: 'description_en', label: '영어 설명' },
              { key: 'teps_point', label: 'TEPS 포인트' },
              { key: 'synonyms', label: '유의어 (쉼표 구분)' },
              { key: 'antonyms', label: '반의어 (쉼표 구분)' },
              { key: 'example_sentence', label: '예문' },
              { key: 'example_translation', label: '예문 해석' },
              { key: 'difficulty_level', label: '난이도 (1-5)' },
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  value={String(editForm[field.key] ?? '')}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
            <Separator className="my-1" />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">AI 재생성 힌트</Label>
              <div className="flex gap-2">
                <Input
                  value={regenHint}
                  onChange={(e) => setRegenHint(e.target.value)}
                  placeholder="ex: 청취 파트 빈출, TEPS 고난도..."
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleRegen}
                  disabled={regenerating || !regenHint.trim()}
                >
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">힌트를 입력하면 AI가 단어 내용을 재생성합니다. 재생성 후 반드시 저장해 주세요.</p>
            </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingWord(null)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Reports ---
interface ReportItem {
  id: string
  metadata: {
    word?: string
    reason?: string
    resolved?: boolean
    resolved_at?: string
  } | null
  created_at: string
}

function ReportsTab() {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchReports = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports?page=${p}`)
      const data = await res.json()
      setReports(data.reports || [])
      setTotalPages(data.totalPages || 1)
    } catch {
      toast({ title: '신고 목록 로드 실패', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports(page)
  }, [page, fetchReports])

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast({ title: '처리 완료' })
        fetchReports(page)
      }
    } catch {
      toast({ title: '처리 실패', variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">신고 내역이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const meta = r.metadata || {}
            const isResolved = !!meta.resolved
            return (
              <Card key={r.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{meta.word || '(알 수 없음)'}</span>
                      {isResolved ? (
                        <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">처리완료</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">대기중</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {meta.reason || '사유 없음'} &middot; {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  {!isResolved && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-green-600"
                      onClick={() => handleResolve(r.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// --- Level Change Requests ---
const LEVEL_BADGE: Record<number, string> = {
  1: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  2: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  3: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  4: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}
const LEVEL_LABEL: Record<number, string> = { 1: 'Essential', 2: 'Core', 3: 'Advanced', 4: 'Killer' }

interface LevelRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  currentLevel: number
  requestedLevel: number
  adminReason: string | null
  type: 'word' | 'expression'
  name: string
  actualCurrentLevel: number
  requesterEmail: string
  requesterName: string | null
  createdAt: string
  resolvedAt: string | null
}

function LevelRequestsTab() {
  const [requests, setRequests] = useState<LevelRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchRequests = useCallback(async (status: string, p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/level-requests?status=${status}&page=${p}`)
      const data = await res.json()
      setRequests(data.requests || [])
      setTotalPages(data.totalPages || 1)
    } catch {
      toast({ title: '로드 실패', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests(statusFilter, page)
  }, [page, statusFilter, fetchRequests])

  const handleStatusFilter = (s: string) => {
    setStatusFilter(s)
    setPage(1)
  }

  const handleAction = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/level-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      if (res.ok) {
        toast({ title: action === 'approve' ? '승인 완료' : '반려 완료' })
        setRejectingId(null)
        setRejectReason('')
        fetchRequests(statusFilter, page)
      } else {
        toast({ title: '처리 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const rejectingRequest = rejectingId ? requests.find((r) => r.id === rejectingId) : null

  return (
    <div className="space-y-4">
      {/* 상태 필터 */}
      <div className="flex gap-1.5 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilter(s)}
          >
            {s === 'pending' ? '대기중' : s === 'approved' ? '승인' : s === 'rejected' ? '반려' : '전체'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">제안 내역이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{r.name}</span>
                      {r.type === 'expression' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800">
                          청해
                        </Badge>
                      )}
                      {r.status === 'pending' && <Badge variant="destructive" className="text-[10px]">대기중</Badge>}
                      {r.status === 'approved' && <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">승인</Badge>}
                      {r.status === 'rejected' && <Badge variant="secondary" className="text-[10px]">반려</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_BADGE[r.currentLevel] || ''}`}>
                        Lv.{r.currentLevel} {LEVEL_LABEL[r.currentLevel]}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_BADGE[r.requestedLevel] || ''}`}>
                        Lv.{r.requestedLevel} {LEVEL_LABEL[r.requestedLevel]}
                      </span>
                      {r.actualCurrentLevel !== r.currentLevel && (
                        <span className="text-[10px] text-orange-500">(현재 실제: Lv.{r.actualCurrentLevel})</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {r.requesterName ? `${r.requesterName} · ` : ''}{r.requesterEmail}
                      {' · '}{new Date(r.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                    {r.adminReason && (
                      <p className="text-[11px] text-muted-foreground italic">반려 사유: {r.adminReason}</p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30"
                        onClick={() => handleAction(r.id, 'approve')}
                        disabled={processing}
                      >
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => { setRejectingId(r.id); setRejectReason('') }}
                        disabled={processing}
                      >
                        반려
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 반려 다이얼로그 */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => { if (!open) setRejectingId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>반려 사유 입력</DialogTitle>
          </DialogHeader>
          {rejectingRequest && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{rejectingRequest.name}</span>의 레벨 변경 제안을 반려합니다.
              </p>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">사유 (선택)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="반려 사유를 입력하세요"
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingId(null)}>취소</Button>
            <Button
              variant="destructive"
              onClick={() => rejectingId && handleAction(rejectingId, 'reject', rejectReason)}
              disabled={processing}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Meaning Correction Requests ---
interface CorrectionRequest {
  id: string
  type: 'word' | 'expression'
  name: string
  entityId: string
  currentMeanings: string[]
  suggestedMeaning: string
  status: 'pending' | 'approved' | 'rejected'
  adminReason: string | null
  requesterEmail: string
  requesterName: string | null
  createdAt: string
  resolvedAt: string | null
}

function MeaningCorrectionsTab() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [regenHints, setRegenHints] = useState<Record<string, string>>({})

  const fetchRequests = useCallback(async (status: string, p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/meaning-corrections?status=${status}&page=${p}`)
      const data = await res.json()
      setRequests(data.requests || [])
      setTotalPages(data.totalPages || 1)
    } catch {
      toast({ title: '로드 실패', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests(statusFilter, page)
  }, [page, statusFilter, fetchRequests])

  const handleRegenAndApprove = async (r: CorrectionRequest) => {
    const hint = (regenHints[r.id] || r.suggestedMeaning).trim()
    if (!hint) return
    setProcessing(r.id)
    try {
      const regenRes = await fetch('/api/admin/words/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.entityId, type: r.type, hint }),
      })
      if (!regenRes.ok) {
        const data = await regenRes.json()
        toast({ title: 'AI 재생성 실패', description: data.error || '', variant: 'destructive' })
        return
      }
      const approveRes = await fetch(`/api/meaning-corrections/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (approveRes.ok) {
        toast({ title: '재생성 및 승인 완료' })
        fetchRequests(statusFilter, page)
      } else {
        toast({ title: '승인 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (id: string, reason: string) => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/meaning-corrections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', adminReason: reason }),
      })
      if (res.ok) {
        toast({ title: '반려 완료' })
        setRejectingId(null)
        setRejectReason('')
        fetchRequests(statusFilter, page)
      } else {
        toast({ title: '처리 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    } finally {
      setProcessing(null)
    }
  }

  const rejectingRequest = rejectingId ? requests.find((r) => r.id === rejectingId) : null

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setStatusFilter(s); setPage(1) }}
          >
            {s === 'pending' ? '대기중' : s === 'approved' ? '승인' : s === 'rejected' ? '반려' : '전체'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">의미 수정 제안이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{r.name}</span>
                      {r.type === 'expression' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800">
                          청해
                        </Badge>
                      )}
                      {r.status === 'pending' && <Badge variant="destructive" className="text-[10px]">대기중</Badge>}
                      {r.status === 'approved' && <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">승인</Badge>}
                      {r.status === 'rejected' && <Badge variant="secondary" className="text-[10px]">반려</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {r.requesterName ? `${r.requesterName} · ` : ''}{r.requesterEmail}
                      {' · '}{new Date(r.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">현재 의미</p>
                    {r.currentMeanings.map((m, i) => (
                      <p key={i} className="text-xs">{i + 1}. {m}</p>
                    ))}
                  </div>
                  <div className="rounded-md bg-orange-50 dark:bg-orange-950/30 px-3 py-2">
                    <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400 mb-1">수정 제안</p>
                    <p className="text-xs">{r.suggestedMeaning}</p>
                  </div>
                </div>

                {r.status === 'pending' && (
                  <div className="space-y-2">
                    <Input
                      value={regenHints[r.id] || ''}
                      onChange={(e) => setRegenHints((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="재생성 힌트 (비워두면 제안 내용 그대로 사용)"
                      className="text-xs h-8"
                    />
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs gap-1.5"
                        onClick={() => handleRegenAndApprove(r)}
                        disabled={processing === r.id}
                      >
                        {processing === r.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Wand2 className="h-3.5 w-3.5" />
                        }
                        재생성 & 승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => { setRejectingId(r.id); setRejectReason('') }}
                        disabled={!!processing}
                      >
                        반려
                      </Button>
                    </div>
                  </div>
                )}

                {r.adminReason && (
                  <p className="text-[11px] text-muted-foreground italic">반려 사유: {r.adminReason}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!rejectingId} onOpenChange={(open) => { if (!open) setRejectingId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>반려 사유 입력</DialogTitle>
          </DialogHeader>
          {rejectingRequest && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{rejectingRequest.name}</span>의 의미 수정 제안을 반려합니다.
              </p>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">사유 (선택)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="반려 사유를 입력하세요"
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingId(null)}>취소</Button>
            <Button
              variant="destructive"
              onClick={() => rejectingId && handleReject(rejectingId, rejectReason)}
              disabled={!!processing}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Repair Expressions ---
interface RepairPreview {
  expression: string
  reasons: string[]
}

function RepairExpressionsTab() {
  const [loadingCount, setLoadingCount] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [preview, setPreview] = useState<RepairPreview[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [logs, setLogs] = useState<{ expression: string; status: string; reasons?: string[] }[]>([])
  const [done, setDone] = useState<{ fixed: number; failed: number } | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const fetchCount = useCallback(async () => {
    setLoadingCount(true)
    setTotal(null)
    setPreview([])
    try {
      const res = await fetch('/api/admin/repair-expressions')
      const data = await res.json()
      setTotal(data.total ?? 0)
      setPreview(data.preview ?? [])
    } catch {
      toast({ title: '조회 실패', variant: 'destructive' })
    } finally {
      setLoadingCount(false)
    }
  }, [])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleRepair = async () => {
    if (!total || total === 0) return
    setRunning(true)
    setDone(null)
    setLogs([])
    setProgress(0)
    setProgressTotal(0)

    try {
      const res = await fetch('/api/admin/repair-expressions', { method: 'POST' })
      if (!res.ok || !res.body) {
        toast({ title: '복구 시작 실패', variant: 'destructive' })
        setRunning(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const evt = JSON.parse(line)
            if (evt.type === 'start') {
              setProgressTotal(evt.total)
            } else if (evt.type === 'progress') {
              setProgress(evt.current)
              setProgressTotal(evt.total)
              setLogs((prev) => [...prev, { expression: evt.expression, status: evt.status, reasons: evt.reasons }])
            } else if (evt.type === 'complete') {
              setDone({ fixed: evt.fixed, failed: evt.failed })
              setTotal(0)
              setPreview([])
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      toast({ title: '복구 중 오류 발생', variant: 'destructive' })
    } finally {
      setRunning(false)
    }
  }

  const pct = progressTotal > 0 ? Math.round((progress / progressTotal) * 100) : 0

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            청해구문 데이터 복구
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <code className="text-xs bg-muted px-1 py-0.5 rounded">image_text</code>가 없거나
            {' '}<code className="text-xs bg-muted px-1 py-0.5 rounded">paraphrasing</code>에 한글이 포함된
            expressions를 AI로 재생성합니다.
          </p>

          {/* 수정 필요 건수 */}
          <div className="flex items-center gap-3">
            {loadingCount ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : total !== null ? (
              <div className="flex items-center gap-2">
                <Badge variant={total > 0 ? 'destructive' : 'secondary'}>
                  {total > 0 ? `${total}건 수정 필요` : '모두 정상'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={fetchCount} className="h-7 text-xs">
                  새로고침
                </Button>
              </div>
            ) : null}
          </div>

          {/* 미리보기 */}
          {preview.length > 0 && !running && !done && (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border p-2 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">수정 대상 미리보기 (최대 20건)</p>
              {preview.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                  <span className="font-medium min-w-0 truncate">{p.expression}</span>
                  <div className="flex gap-1 shrink-0">
                    {p.reasons.map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0">{r}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 복구 버튼 */}
          {!done && (
            <Button
              onClick={handleRepair}
              disabled={running || loadingCount || total === 0}
              className="w-full"
            >
              {running ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />복구 중... ({progress}/{progressTotal})</>
              ) : (
                <><Wrench className="h-4 w-4 mr-2" />복구 시작</>
              )}
            </Button>
          )}

          {/* 진행 바 */}
          {running && progressTotal > 0 && (
            <div className="space-y-1">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">{pct}%</p>
            </div>
          )}

          {/* 완료 결과 */}
          {done && (
            <div className="rounded-md border bg-green-50 dark:bg-green-900/20 p-3 space-y-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">복구 완료</p>
              <p className="text-xs text-green-700 dark:text-green-400">
                성공 {done.fixed}건 / 실패 {done.failed}건
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => { setDone(null); fetchCount() }}>
                다시 확인
              </Button>
            </div>
          )}

          {/* 로그 */}
          {logs.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-md border p-2 bg-muted/20 space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">처리 로그</p>
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                  <span className={`shrink-0 font-medium ${log.status === 'fixed' ? 'text-green-600 dark:text-green-400' : log.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {log.status === 'fixed' ? '✓' : log.status === 'failed' ? '✗' : '…'}
                  </span>
                  <span className="truncate">{log.expression}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- Main Admin Page ---
export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuthContext()
  const router = useRouter()

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (!user || profile?.role !== 'admin') {
    router.push('/')
    return null
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">관리자</h1>

        <Tabs defaultValue="dashboard">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="words">단어 관리</TabsTrigger>
            <TabsTrigger value="reports">신고 관리</TabsTrigger>
            <TabsTrigger value="level-requests">Level 제안</TabsTrigger>
            <TabsTrigger value="meaning-corrections">의미 수정</TabsTrigger>
            <TabsTrigger value="repair">데이터 복구</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>

          <TabsContent value="words">
            <WordsTab />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="level-requests">
            <LevelRequestsTab />
          </TabsContent>

          <TabsContent value="meaning-corrections">
            <MeaningCorrectionsTab />
          </TabsContent>

          <TabsContent value="repair">
            <RepairExpressionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
