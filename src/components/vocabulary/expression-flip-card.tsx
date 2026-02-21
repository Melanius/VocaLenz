'use client'

import { useState } from 'react'
import { Check, CheckCircle2, Eye, RotateCcw, Trash2, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatAddedDate } from '@/lib/date-utils'
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
  const expr = item.expression
  if (!expr) return null
  const levelConfig = LEVEL_CONFIG[expr.difficulty_level] || LEVEL_CONFIG[2]

  const cardBase = `rounded-xl border border-t-[3px] ${levelConfig.stripe} bg-card shadow-sm cursor-pointer flex flex-col`
  const reviewRing = item.needs_review ? 'ring-2 ring-orange-400/50' : ''
  const memorizedDim = item.is_memorized ? 'opacity-60' : ''

  return (
    <div className="flip-card relative">
      {item.needs_review && (
        <span className="absolute -top-1.5 -right-1.5 z-10 inline-flex items-center rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-semibold text-white animate-pulse shadow-md">
          복습
        </span>
      )}

      <div
        className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
        style={{ minHeight: '200px' }}
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
                Lv.{expr.difficulty_level} {levelConfig.label}
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

          {/* 하단: 메모 or 힌트 */}
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
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold">{expr.expression}</h3>
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
              표현
            </span>
          </div>

          <hr className="my-2.5 border-dashed border-border" />

          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {expr.meanings.map((m, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-base font-medium text-foreground leading-relaxed">{m}</p>
              </div>
            ))}
            {expr.description && (
              <p className="text-sm leading-relaxed text-muted-foreground mt-2">
                {expr.description}
              </p>
            )}
            {expr.example_sentence && (
              <div className="mt-2.5 border-l-2 border-indigo-300 dark:border-indigo-700 pl-3 space-y-0.5">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                  {expr.example_sentence}
                </p>
                {expr.example_translation && (
                  <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                    {expr.example_translation}
                  </p>
                )}
              </div>
            )}
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
              복습
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
            </div>
            <input
              type="text"
              value={memoValue}
              onChange={(e) => setMemoValue(e.target.value)}
              onBlur={() => {
                if (memoValue !== (item.memo || '')) {
                  onMemoUpdate(item.id, memoValue)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              placeholder="메모를 입력하세요 (예: test-4 청해)"
              className="w-full text-xs px-2.5 py-1.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
