'use client'

import { Check, Eye, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatAddedDate } from '@/lib/date-utils'
import type { UserVocabulary, Word } from '@/types/database'

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Essential', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  2: { label: 'Core', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  3: { label: 'Advanced', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  4: { label: 'Killer', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
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

  return (
    <div className="flip-card relative">
      {/* 복습 배지 - 양면 모두 보임 */}
      {item.needs_review && (
        <span className="absolute -top-1 -right-1 z-10 inline-flex items-center rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white animate-pulse shadow-md">
          복습
        </span>
      )}

      <div
        className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
        style={{ minHeight: '180px' }}
      >
        {/* 앞면 */}
        <div
          className={`flip-card-front rounded-xl border bg-card p-4 shadow-sm cursor-pointer flex flex-col ${
            item.is_memorized ? 'opacity-60' : ''
          } ${item.needs_review ? 'ring-2 ring-orange-400/50' : ''}`}
          onClick={onFlip}
        >
          {/* 상단: 레벨 + POS | 날짜 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${levelConfig.color}`}>
                Lv.{word.difficulty_level}
              </span>
              {word.part_of_speech &&
                word.part_of_speech.split('/').map((pos, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {pos.trim()}
                  </Badge>
                ))}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatAddedDate(item.added_at)}
            </span>
          </div>

          {/* 중앙: 단어 */}
          <div className="flex-1 flex items-center justify-center py-4">
            <h3 className="text-2xl font-bold text-center">{word.word}</h3>
          </div>

          {/* 하단: 힌트 */}
          <p className="text-xs text-muted-foreground text-center">
            탭하여 뜻 확인
          </p>
        </div>

        {/* 뒷면 */}
        <div
          className={`flip-card-back rounded-xl border bg-card p-4 shadow-sm cursor-pointer flex flex-col ${
            item.is_memorized ? 'opacity-60' : ''
          } ${item.needs_review ? 'ring-2 ring-orange-400/50' : ''}`}
          onClick={onFlip}
        >
          {/* 상단: 단어 + 발음 */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{word.word}</h3>
              {word.pronunciation && (
                <span className="text-xs text-muted-foreground">
                  [{word.pronunciation}]
                </span>
              )}
            </div>
          </div>

          <hr className="my-2 border-border" />

          {/* 뜻 목록 */}
          <div className="flex-1 space-y-1 overflow-y-auto">
            {word.meanings.map((m, i) => (
              <p key={i} className="text-sm text-foreground">
                {i + 1}. {m}
              </p>
            ))}
            {word.description && (
              <p className="text-xs text-muted-foreground mt-2">
                {word.description}
              </p>
            )}
            {word.example_sentence && (
              <div className="mt-2 text-xs text-muted-foreground italic">
                <p>&ldquo;{word.example_sentence}&rdquo;</p>
                {word.example_translation && (
                  <p className="not-italic">{word.example_translation}</p>
                )}
              </div>
            )}
          </div>

          {/* 하단 액션 바 */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onDetail(item)}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              상세
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onToggleMemorized(item)}>
              <Check className={`h-3.5 w-3.5 mr-1 ${item.is_memorized ? 'text-green-500' : ''}`} />
              {item.is_memorized ? '암기됨' : '암기'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onToggleReview(item)}>
              <RotateCcw className={`h-3.5 w-3.5 mr-1 ${item.needs_review ? 'text-orange-500' : ''}`} />
              복습
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              삭제
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
