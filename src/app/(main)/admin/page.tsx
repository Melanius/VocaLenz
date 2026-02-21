'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Trash2, Save, Loader2, Users, BookOpen,
  BarChart3, CheckCircle2, ChevronLeft, ChevronRight, ArrowRight,
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
import { useAuthContext } from '@/components/providers/auth-provider'
import { toast } from '@/hooks/use-toast'
import type { Word } from '@/types/database'

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

  return (
    <div className="space-y-4">
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
      </div>

      <p className="text-xs text-muted-foreground">총 {total.toLocaleString()}개</p>

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
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="words">단어 관리</TabsTrigger>
            <TabsTrigger value="reports">신고 관리</TabsTrigger>
            <TabsTrigger value="level-requests">Level 제안</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  )
}
