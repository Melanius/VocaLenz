'use client'

import { useState, useEffect } from 'react'
import { Search, AlertTriangle, Globe, Ban, MinusCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { WordCard } from './word-card'
import { getRandomPhrase, type LoadingPhrase } from '@/lib/loading-phrases'
import type { SearchResult } from '@/types/database'

interface SearchResultsProps {
  query: string
  result: SearchResult
  onSearchWord?: (word: string) => void
}

export function SearchResults({ query, result, onSearchWord }: SearchResultsProps) {
  return (
    <div className="space-y-3">
      {/* 사용자 검색 버블 */}
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[80%]">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-sm font-medium">{query}</span>
          </div>
        </div>
      </div>

      {/* AI 응답 버블 */}
      <div className="flex justify-start">
        <div className="max-w-full w-full">
          <ResultBubble result={result} onSearchWord={onSearchWord} />
        </div>
      </div>
    </div>
  )
}

function ResultBubble({
  result,
  onSearchWord,
}: {
  result: SearchResult
  onSearchWord?: (word: string) => void
}) {
  switch (result.type) {
    case 'loading':
      return <LoadingBubble />

    case 'word':
      return <WordCard word={result.data} />

    case 'typo':
      return (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-2xl rounded-tl-md border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                <span className="font-medium">&ldquo;{result.original}&rdquo;</span>는 오타일 수 있습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                혹시 <span className="font-semibold text-foreground">&ldquo;{result.correction}&rdquo;</span>을(를)
                찾으셨나요?
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onSearchWord?.(result.correction)}
                >
                  맞아요, &ldquo;{result.correction}&rdquo; 검색
                </Button>
              </div>
            </div>
          </div>
        </div>
      )

    case 'korean':
      return (
        <div className="space-y-3">
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-2xl rounded-tl-md border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-purple-600 dark:text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  <span className="font-medium">&ldquo;{result.original}&rdquo;</span>
                  {result.suggestions.length > 0
                    ? `에 해당하는 단어 ${result.suggestions.length}개를 찾았습니다.`
                    : '에 해당하는 등록된 단어가 아직 없습니다.'}
                </p>
              </div>
            </div>
          </div>
          {result.suggestions.map((word) => (
            <WordCard key={word.id} word={word} />
          ))}
        </div>
      )

    case 'invalid':
      return (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl rounded-tl-md border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-start gap-3">
            <Ban className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground">
                <span className="font-medium">&ldquo;{result.original}&rdquo;</span>은(는) 유효한 영어 단어가 아닙니다.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                영어 단어 하나를 입력해 주세요. (문장, 숫자, 특수문자는 지원하지 않습니다)
              </p>
            </div>
          </div>
        </div>
      )

    case 'low_value':
      return (
        <div className="bg-gray-50 dark:bg-gray-950/30 rounded-2xl rounded-tl-md border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-start gap-3">
            <MinusCircle className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground">
                <span className="font-medium">&ldquo;{result.original}&rdquo;</span>은(는) TEPS 학습에 적합하지 않은 단어입니다.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                관사, 전치사, 대명사 등 기본 단어는 별도의 학습 카드를 제공하지 않습니다.
              </p>
            </div>
          </div>
        </div>
      )

    case 'error':
      return (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl rounded-tl-md border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{result.message}</p>
          </div>
        </div>
      )

    default:
      return null
  }
}

function LoadingBubble() {
  const [phrase, setPhrase] = useState<LoadingPhrase>(getRandomPhrase)

  useEffect(() => {
    const interval = setInterval(() => {
      setPhrase(getRandomPhrase())
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-card rounded-2xl rounded-tl-md border p-4 space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">검색 중...</span>
      </div>
      <div className="bg-accent/50 rounded-lg p-3 space-y-1.5">
        <p className="text-xs text-muted-foreground">기다리시면서 아래 문장을 외워보세요!</p>
        <p className="text-sm font-medium text-foreground">{phrase.en}</p>
        <p className="text-xs text-muted-foreground">{phrase.ko}</p>
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}
