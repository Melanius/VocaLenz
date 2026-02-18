'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { BarChart3, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthContext } from '@/components/providers/auth-provider'
import { toast } from '@/hooks/use-toast'
import { ScoreCoach } from '@/components/scores/score-coach'
import type { UserScore } from '@/types/database'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type ChartMode = 'total' | 'detail'

const LINE_COLORS: Record<string, string> = {
  total: '#6366f1',
  listening: '#f59e0b',
  vocabulary: '#10b981',
  grammar: '#3b82f6',
  reading: '#ef4444',
}

export default function ScoresPage() {
  const { user, loading: authLoading } = useAuthContext()
  const [scores, setScores] = useState<UserScore[]>([])
  const [loading, setLoading] = useState(false)
  const [chartMode, setChartMode] = useState<ChartMode>('total')
  const [activeTab, setActiveTab] = useState('list')

  // Dialog 상태
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    round: '',
    listening: '',
    vocabulary: '',
    grammar: '',
    reading: '',
    exam_date: '',
  })

  const totalScore = (
    (parseInt(form.listening) || 0) +
    (parseInt(form.vocabulary) || 0) +
    (parseInt(form.grammar) || 0) +
    (parseInt(form.reading) || 0)
  )

  const fetchScores = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/scores')
      if (res.ok) {
        const data = await res.json()
        setScores(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchScores()
  }, [user, fetchScores])

  const resetForm = () => {
    setForm({ round: '', listening: '', vocabulary: '', grammar: '', reading: '', exam_date: '' })
    setEditingId(null)
  }

  const openNewDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (score: UserScore) => {
    setEditingId(score.id)
    setForm({
      round: score.round || '',
      listening: score.listening?.toString() || '',
      vocabulary: score.vocabulary?.toString() || '',
      grammar: score.grammar?.toString() || '',
      reading: score.reading?.toString() || '',
      exam_date: score.exam_date || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      round: form.round || null,
      listening: parseInt(form.listening) || null,
      vocabulary: parseInt(form.vocabulary) || null,
      grammar: parseInt(form.grammar) || null,
      reading: parseInt(form.reading) || null,
      total: totalScore || null,
      exam_date: form.exam_date || null,
    }

    try {
      if (editingId) {
        const res = await fetch('/api/scores', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scoreId: editingId, ...payload }),
        })
        if (res.ok) {
          toast({ title: '수정 완료', description: '성적이 수정되었습니다.' })
          setDialogOpen(false)
          resetForm()
          fetchScores()
        }
      } else {
        const res = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          toast({ title: '입력 완료', description: '성적이 입력되었습니다.' })
          setDialogOpen(false)
          resetForm()
          fetchScores()
        }
      }
    } catch {
      toast({ title: '오류', description: '저장에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleDelete = async (scoreId: string) => {
    try {
      const res = await fetch('/api/scores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreId }),
      })
      if (res.ok) {
        toast({ title: '삭제 완료', description: '성적이 삭제되었습니다.' })
        fetchScores()
      }
    } catch {
      toast({ title: '오류', description: '삭제에 실패했습니다.', variant: 'destructive' })
    }
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
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">TEPS 성적을 기록하고 추이를 확인하세요</h2>
          <p className="text-muted-foreground">
            로그인하면 시험 성적을 입력하고<br />
            영역별 점수 변화를 차트로 확인할 수 있어요.
          </p>
          <Button asChild>
            <Link href="/auth/login">로그인하고 시작하기</Link>
          </Button>
        </div>
      </div>
    )
  }

  // 차트용: 오래된 순 (API가 ascending 반환)
  const chartData = scores.map((s) => ({
    name: s.round || s.exam_date || '-',
    총점: s.total,
    청해: s.listening,
    어휘: s.vocabulary,
    문법: s.grammar,
    독해: s.reading,
  }))

  // 목록용: 최신 순
  const listScores = [...scores].reverse()

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">성적 관리</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">성적 목록</TabsTrigger>
            <TabsTrigger value="chart">추이 차트</TabsTrigger>
            <TabsTrigger value="coach">TEPS 코치</TabsTrigger>
          </TabsList>

          {/* 성적 목록 */}
          <TabsContent value="list">
            {/* 상단: 새 성적 입력 버튼 */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {scores.length > 0 ? `총 ${scores.length}회 기록` : ''}
              </p>
              <Button size="sm" onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-1.5" />
                새 성적 입력
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : scores.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">아직 입력된 성적이 없습니다.</p>
                <Button variant="outline" size="sm" onClick={openNewDialog}>
                  첫 성적 입력하기
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-2 text-left font-medium">회차</th>
                      <th className="py-3 px-2 text-right font-medium">청해</th>
                      <th className="py-3 px-2 text-right font-medium">어휘</th>
                      <th className="py-3 px-2 text-right font-medium">문법</th>
                      <th className="py-3 px-2 text-right font-medium">독해</th>
                      <th className="py-3 px-2 text-right font-medium">총점</th>
                      <th className="py-3 px-2 text-right font-medium">시험일</th>
                      <th className="py-3 px-2 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listScores.map((score) => (
                      <tr key={score.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">{score.round || '-'}</td>
                        <td className="py-3 px-2 text-right">{score.listening ?? '-'}</td>
                        <td className="py-3 px-2 text-right">{score.vocabulary ?? '-'}</td>
                        <td className="py-3 px-2 text-right">{score.grammar ?? '-'}</td>
                        <td className="py-3 px-2 text-right">{score.reading ?? '-'}</td>
                        <td className="py-3 px-2 text-right font-semibold">{score.total ?? '-'}</td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {score.exam_date || '-'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(score)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(score.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* 추이 차트 */}
          <TabsContent value="chart">
            {scores.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">차트를 표시하려면 성적을 입력해 주세요.</p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">성적 추이</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={chartMode === 'total' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartMode('total')}
                      >
                        총점
                      </Button>
                      <Button
                        variant={chartMode === 'detail' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartMode('detail')}
                      >
                        영역별
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      {chartMode === 'total' ? (
                        <Line
                          type="monotone"
                          dataKey="총점"
                          stroke={LINE_COLORS.total}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ) : (
                        <>
                          <Line type="monotone" dataKey="청해" stroke={LINE_COLORS.listening} strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="어휘" stroke={LINE_COLORS.vocabulary} strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="문법" stroke={LINE_COLORS.grammar} strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="독해" stroke={LINE_COLORS.reading} strokeWidth={2} dot={{ r: 3 }} />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TEPS 코치 */}
          <TabsContent value="coach">
            <ScoreCoach
              hasScores={scores.length > 0}
              onGoToList={() => setActiveTab('list')}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 성적 입력/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? '성적 수정' : '새 성적 입력'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="round">회차</Label>
                <Input
                  id="round"
                  placeholder="예: 제200회"
                  value={form.round}
                  onChange={(e) => setForm({ ...form, round: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam_date">시험일</Label>
                <Input
                  id="exam_date"
                  type="date"
                  value={form.exam_date}
                  onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="listening">청해 (0~240)</Label>
                <Input
                  id="listening"
                  type="number"
                  min={0}
                  max={240}
                  placeholder="0"
                  value={form.listening}
                  onChange={(e) => setForm({ ...form, listening: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vocabulary">어휘 (0~60)</Label>
                <Input
                  id="vocabulary"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="0"
                  value={form.vocabulary}
                  onChange={(e) => setForm({ ...form, vocabulary: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grammar">문법 (0~60)</Label>
                <Input
                  id="grammar"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="0"
                  value={form.grammar}
                  onChange={(e) => setForm({ ...form, grammar: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading">독해 (0~240)</Label>
                <Input
                  id="reading"
                  type="number"
                  min={0}
                  max={240}
                  placeholder="0"
                  value={form.reading}
                  onChange={(e) => setForm({ ...form, reading: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                총점: <span className="font-bold text-foreground">{totalScore}</span>
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
                  취소
                </Button>
                <Button type="submit">
                  {editingId ? '수정' : '저장'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
