'use client'

import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { analytics } from '@/lib/analytics'

interface RecommendedWordsProps {
  onSearchWord: (word: string) => void
}

export function RecommendedWords({ onSearchWord }: RecommendedWordsProps) {
  const [words, setWords] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/words/recommended')
      .then((res) => res.json())
      .then((data) => {
        setWords(data.words || [])
      })
      .catch(() => {
        setWords([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>오늘의 추천 단어</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (words.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendingUp className="h-3 w-3" />
        <span>오늘의 추천 단어</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {words.map((word) => (
          <button
            key={word}
            onClick={() => {
              analytics.track('recommended_click', { word })
              onSearchWord(word)
            }}
            className="px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-sm font-medium text-primary"
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  )
}
