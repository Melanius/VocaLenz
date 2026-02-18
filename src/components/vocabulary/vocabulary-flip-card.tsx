'use client'

import { Check, CheckCircle2, Eye, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatAddedDate } from '@/lib/date-utils'
import type { UserVocabulary } from '@/types/database'

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
  item: UserVocabulary
  isFlipped: boolean
  onFlip: () => void
  onDetail: (item: UserVocabulary) => void
  onToggleMemorized: (item: UserVocabulary) => void
  onToggleReview: (item: UserVocabulary) => void
  onDelete: (item: UserVocabulary) => void
}

export function VocabularyFlipCard({
  item,
  isFlipped,
  onFlip,
  onDetail,
  onToggleMemorized,
  onToggleReview,
  onDelete,
}: Props) {
  const word = item.word
  if (!word) return null
  const levelConfig = LEVEL_CONFIG[word.difficulty_level] || LEVEL_CONFIG[2]

  const cardBase = `rounded-xl border border-t-[3px] ${levelConfig.stripe} bg-card shadow-sm cursor-pointer flex flex-col`
  const reviewRing = item.needs_review ? 'ring-2 ring-orange-400/50' : ''
  const memorizedDim = item.is_memorized ? 'opacity-60' : ''

  return (
    <div className="flip-card relative">
      {/* 복습 배지 - 양면 모두 보임 */}
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
          {/* 상단: 레벨 + POS | 날짜 */}
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${levelConfig.badge}`}>
              Lv.{word.difficulty_level} {levelConfig.label}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatAddedDate(item.added_at)}
            </span>
          </div>

          {/* 중앙: 단어 + 암기완료 오버레이 */}
          <div className="flex-1 flex items-center justify-center py-6 relative">
            <h3 className="text-3xl font-extrabold tracking-tight text-center">{word.word}</h3>
            {item.is_memorized && (
              <CheckCircle2 className="absolute right-0 bottom-1 h-10 w-10 text-green-500/20" />
            )}
          </div>

          {/* 하단: 힌트 */}
          <p className="text-xs text-muted-foreground text-center animate-pulse">
            탭하여 뜻 확인
          </p>
        </div>

        {/* 뒷면 */}
        <div
          className={`flip-card-back p-5 ${cardBase} ${memorizedDim} ${reviewRing}`}
          onClick={onFlip}
        >
          {/* 상단: 단어 + 발음 */}
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl font-bold">{word.word}</h3>
            {word.pronunciation && (
              <span className="text-sm text-muted-foreground">
                {word.pronunciation}
              </span>
            )}
          </div>

          <hr className="my-2.5 border-dashed border-border" />

          {/* 뜻 목록 */}
          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {word.meanings.map((m, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-base font-medium text-foreground leading-relaxed">{m}</p>
              </div>
            ))}
            {word.description && (
              <p className="text-sm leading-relaxed text-muted-foreground mt-2">
                {word.description}
              </p>
            )}
            {word.example_sentence && (
              <div className="mt-2.5 border-l-2 border-indigo-300 dark:border-indigo-700 pl-3 space-y-0.5">
                <p className="text-sm leading-relaxed text-foreground">
                  {word.example_sentence}
                </p>
                {word.example_translation && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {word.example_translation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 하단 액션 바 */}
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
        </div>
      </div>
    </div>
  )
}
