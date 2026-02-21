'use client'

import { useState, useRef } from 'react'
import { Check, CheckCircle2, Eye, RotateCcw, Trash2, StickyNote, ChevronDown, ArrowRight, Loader2, SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatAddedDate } from '@/lib/date-utils'
import { useToast } from '@/hooks/use-toast'
import type { UserExpression } from '@/types/database'

const LEVEL_CONFIG: Record<number, { label: string; badge: string; stripe: string }> = {
  1: {
    label: 'Essential',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    stripe: 'border-t-green-500',
  },
  2: {
    label: 'Core',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    stripe: 'border-t-blue-500',
  },
  3: {
    label: 'Advanced',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    stripe: 'border-t-orange-500',
  },
  4: {
    label: 'Killer',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    stripe: 'border-t-red-500',
  },
}

interface Props {
  item: UserExpression
  isFlipped: boolean
  onFlip: () => void
  onDetail: (item: UserExpression) => void
  onToggleMemorized: (item: UserExpression) => void
  onToggleReview: (item: UserExpression) => void
  onDelete: (item: UserExpression) => void
  onMemoUpdate: (id: string, memo: string) => void
}

export function ExpressionFlipCard({
  item,
  isFlipped,
  onFlip,
  onDetail,
  onToggleMemorized,
  onToggleReview,
  onDelete,
  onMemoUpdate,
}: Props) {
  const [memoValue, setMemoValue] = useState(item.memo || '')
  const [localSavedMemo, setLocalSavedMemo] = useState(item.memo || '')
  const [isSaved, setIsSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localLevel, setLocalLevel] = useState(item.expression?.difficulty_level ?? 2)
  const [levelOpen, setLevelOpen] = useState(false)
  const [proposedLevel, setProposedLevel] = useState<number | null>(null)
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const { toast } = useToast()

  const expr = item.expression
  if (!expr) return null
  const levelConfig = LEVEL_CONFIG[localLevel] || LEVEL_CONFIG[2]

  const cardBase = `rounded-xl border border-t-[3px] ${levelConfig.stripe} bg-card shadow-sm cursor-pointer flex flex-col`
  const reviewRing = item.needs_review ? 'ring-2 ring-orange-400/50' : ''
  const memorizedDim = item.is_memorized ? 'opacity-60' : ''

  const saveMemo = () => {
    if (memoValue !== localSavedMemo) {
      onMemoUpdate(item.id, memoValue)
      setLocalSavedMemo(memoValue)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setIsSaved(true)
      savedTimerRef.current = setTimeout(() => setIsSaved(false), 1500)
    }
  }

  const handleLevelSelect = (lv: number) => {
    if (lv === localLevel) { setLevelOpen(false); return }
    setLevelOpen(false)
    setProposedLevel(lv)
  }

  const handleSubmitLevelRequest = async () => {
    if (proposedLevel === null) return
    setSubmittingRequest(true)
    try {
      const res = await fetch('/api/level-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expressionId: expr.id,
          currentLevel: localLevel,
          requestedLevel: proposedLevel,
        }),
      })
      const data = await res.json()
      if (res.status === 409) {
        toast({ title: '이미 검토 중인 제안이 있어요', description: '처리 완료 후 다시 제안할 수 있어요.' })
      } else if (!res.ok) {
        toast({ title: '제안 실패', description: data.error || '잠시 후 다시 시도해 주세요.', variant: 'destructive' })
      } else {
        toast({ title: '제안이 접수됐어요!', description: '관리자 검토 후 결과를 알려드릴게요.' })
      }
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    } finally {
      setSubmittingRequest(false)
      setProposedLevel(null)
    }
  }

  return (
    <>
      <div className="flip-card relative">
        {item.needs_review && (
          <span className="absolute -top-1.5 -right-1.5 z-10 inline-flex items-center rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-semibold text-white animate-pulse shadow-md">
            오답
          </span>
        )}

        <div
          className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
          style={{ minHeight: '300px' }}
        >
          {/* 앞면 */}
          <div
            className={`flip-card-front p-5 ${cardBase} ${memorizedDim} ${reviewRing}`}
            onClick={onFlip}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                  청해
                </span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${levelConfig.badge}`}>
                  Lv.{localLevel} {levelConfig.label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatAddedDate(item.added_at)}
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center py-6 relative">
              <h3 className="text-2xl font-extrabold tracking-tight text-center">{expr.expression}</h3>
              {item.is_memorized && (
                <CheckCircle2 className="absolute right-0 bottom-1 h-10 w-10 text-green-500/20" />
              )}
            </div>

            {item.memo ? (
              <div className="flex items-center gap-1 min-w-0">
                <StickyNote className="h-3 w-3 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400 truncate">{item.memo}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center animate-pulse">
                탭하여 뜻 확인
              </p>
            )}
          </div>

          {/* 뒷면 */}
          <div
            className={`flip-card-back p-5 ${cardBase} ${memorizedDim} ${reviewRing}`}
            onClick={onFlip}
          >
            {/* 상단: 구문 + 청해 뱃지 + 레벨 편집 */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-lg font-bold truncate">{expr.expression}</h3>
                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 flex-shrink-0">
                  청해
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                <Popover open={levelOpen} onOpenChange={setLevelOpen}>
                  <PopoverTrigger asChild>
                    <button className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-semibold ${levelConfig.badge} hover:opacity-80 transition-opacity`}>
                      Lv.{localLevel}
                      <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1" side="bottom" align="end">
                    <p className="text-[10px] text-muted-foreground px-2 py-1">Level 변경 제안</p>
                    {[1, 2, 3, 4].map((lv) => (
                      <button
                        key={lv}
                        onClick={() => handleLevelSelect(lv)}
                        className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent ${lv === localLevel ? 'bg-accent' : ''}`}
                      >
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_CONFIG[lv].badge}`}>
                          Lv.{lv}
                        </span>
                        {LEVEL_CONFIG[lv].label}
                        {lv === localLevel && <span className="ml-auto text-[10px] text-muted-foreground">현재</span>}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <hr className="my-2.5 border-dashed border-border" />

            <div className="flex-1 space-y-2 overflow-y-auto">
              {expr.meanings.map((m, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="text-lg font-semibold text-foreground leading-snug">{m}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={() => onDetail(item)}>
                <Eye className="h-3.5 w-3.5 mr-1" />
                상세
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2.5 text-xs ${
                  item.is_memorized
                    ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                    : ''
                }`}
                onClick={() => onToggleMemorized(item)}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {item.is_memorized ? '암기됨' : '암기'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2.5 text-xs ${
                  item.needs_review
                    ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50'
                    : ''
                }`}
                onClick={() => onToggleReview(item)}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                오답
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(item)}
                aria-label="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* 메모 입력 */}
            <div className="mt-2 pt-2 border-t border-dashed border-border" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 mb-1">
                <StickyNote className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-muted-foreground font-medium">메모</span>
                {isSaved && (
                  <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400 ml-auto">
                    <Check className="h-3 w-3" />
                    저장됨
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={memoValue}
                  onChange={(e) => setMemoValue(e.target.value)}
                  onBlur={saveMemo}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder="메모를 입력하세요 (예: test-4 청해)"
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  onClick={saveMemo}
                  disabled={memoValue === localSavedMemo}
                  className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="메모 저장"
                >
                  <SendHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level 변경 제안 다이얼로그 */}
      {proposedLevel !== null && (
        <Dialog open onOpenChange={(open) => { if (!open) setProposedLevel(null) }}>
          <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Level 변경 제안</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{expr.expression}</span>의 레벨 변경을 관리자에게 제안합니다.
              </p>
              <div className="flex items-center gap-3 justify-center">
                <span className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold ${LEVEL_CONFIG[localLevel].badge}`}>
                  Lv.{localLevel} {LEVEL_CONFIG[localLevel].label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold ${LEVEL_CONFIG[proposedLevel].badge}`}>
                  Lv.{proposedLevel} {LEVEL_CONFIG[proposedLevel].label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                관리자 검토 후 변경 결과를 알림으로 알려드립니다.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setProposedLevel(null)}>취소</Button>
              <Button onClick={handleSubmitLevelRequest} disabled={submittingRequest}>
                {submittingRequest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                제안하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
