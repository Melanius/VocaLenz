'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Check, Trash2, Star, Eye, Loader2 } from 'lucide-react'
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

type FilterType = 'all' | 'not-memorized' | 'memorized'

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Essential', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  2: { label: 'Core', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  3: { label: 'Advanced', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  4: { label: 'Killer', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

export default function VocabularyPage() {
  const { user, loading: authLoading } = useAuthContext()
  const { vocabularyItems, count, loading, toggleMemorized, refresh } = useVocabulary()
  const [filter, setFilter] = useState<FilterType>('all')
  const [detailWord, setDetailWord] = useState<Word | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

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
          <h2 className="text-xl font-semibold">로그인이 필요합니다</h2>
          <p className="text-muted-foreground">단어장을 사용하려면 로그인해 주세요.</p>
          <Button asChild>
            <Link href="/auth/login">로그인</Link>
          </Button>
        </div>
      </div>
    )
  }

  const filtered = vocabularyItems.filter((item) => {
    if (filter === 'memorized') return item.is_memorized
    if (filter === 'not-memorized') return !item.is_memorized
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
    // 짧은 로딩 연출 후 표시
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

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">내 단어장</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {count}/100 단어
            </p>
          </div>
          <div className="flex gap-2">
            {(['all', 'not-memorized', 'memorized'] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '전체' : f === 'not-memorized' ? '미암기' : '암기완료'}
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
                검색 결과에서 ⭐ 버튼을 눌러 단어를 추가하세요.
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
                        <div className="flex items-center gap-2 mb-1">
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
    </div>
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
