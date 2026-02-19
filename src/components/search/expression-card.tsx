'use client'

import { Volume2, Star, Headphones, BookOpen, Target, Quote, RefreshCw, GitCompare, MessageSquare, Ear } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePronunciation } from '@/hooks/use-pronunciation'
import { useExpressionVocabulary } from '@/hooks/use-expression-vocabulary'
import { useAuthContext } from '@/components/providers/auth-provider'
import { toast } from '@/hooks/use-toast'
import type { Expression } from '@/types/database'

interface ExpressionCardProps {
  expression: Expression
  showVocabularyButton?: boolean
}

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Essential', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  2: { label: 'Core', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  3: { label: 'Advanced', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  4: { label: 'Killer', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

export function ExpressionCard({ expression, showVocabularyButton = true }: ExpressionCardProps) {
  const { speak } = usePronunciation()
  const { user } = useAuthContext()
  const { isInExpressionVocabulary, addToExpressionVocabulary, removeFromExpressionVocabulary } = useExpressionVocabulary()
  const levelConfig = LEVEL_CONFIG[expression.difficulty_level] || LEVEL_CONFIG[2]

  const inVocab = user ? isInExpressionVocabulary(expression.id) : false

  const handleVocabularyToggle = async () => {
    if (!user) return
    const result = inVocab
      ? await removeFromExpressionVocabulary(expression.id)
      : await addToExpressionVocabulary(expression.id)
    toast({
      title: result.success ? (inVocab ? '제거 완료' : '추가 완료') : '오류',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    })
  }

  return (
    <Card className="w-full border-l-4 border-l-sky-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user && showVocabularyButton && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full -ml-1"
                onClick={handleVocabularyToggle}
                aria-label={inVocab ? '표현 단어장에서 제거' : '표현 단어장에 추가'}
              >
                <Star
                  className={`h-6 w-6 ${
                    inVocab
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </Button>
            )}
            <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
              {expression.expression}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => speak(expression.expression)}
              aria-label="발음 듣기"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
              표현
            </Badge>
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${levelConfig.color}`}>
              Lv.{expression.difficulty_level} {levelConfig.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-6">
        {/* 뜻 */}
        {expression.meanings && expression.meanings.length > 0 && (
          <Section icon={BookOpen} label="뜻" color="border-l-emerald-500">
            <ol className="space-y-1.5">
              {expression.meanings.map((m, i) => (
                <li key={i} className="flex items-baseline gap-2 text-base leading-relaxed">
                  <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-foreground font-medium">{m}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* 설명 */}
        {expression.description && (
          <Section icon={MessageSquare} label="뉘앙스 설명" color="border-l-blue-500">
            <p className="text-[15px] leading-relaxed text-foreground">{expression.description}</p>
          </Section>
        )}

        {/* 대화 상황 */}
        {expression.context && (
          <Section icon={Headphones} label="사용 상황" color="border-l-purple-500">
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3.5">
              <p className="text-[15px] leading-relaxed text-purple-900 dark:text-purple-200">
                {expression.context}
              </p>
            </div>
          </Section>
        )}

        {/* 발음/연음 팁 */}
        {expression.pronunciation_tip && (
          <Section icon={Ear} label="발음/연음 팁" color="border-l-pink-500">
            <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-lg p-3.5">
              <p className="text-[15px] leading-relaxed text-pink-900 dark:text-pink-200">
                {expression.pronunciation_tip}
              </p>
            </div>
          </Section>
        )}

        {/* TEPS 포인트 */}
        {expression.teps_point && (
          <Section icon={Target} label="TEPS 포인트" color="border-l-violet-500">
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-3.5">
              <p className="text-[15px] leading-relaxed text-violet-900 dark:text-violet-200">
                {expression.teps_point}
              </p>
            </div>
          </Section>
        )}

        {/* 출제 파트 */}
        {expression.listening_parts && expression.listening_parts.length > 0 && (
          <Section icon={Headphones} label="출제 파트" color="border-l-sky-500">
            <div className="flex flex-wrap gap-2">
              {expression.listening_parts.map((part, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                >
                  {part}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* 패러프레이징 */}
        {expression.paraphrasing && expression.paraphrasing.length > 0 && (
          <Section icon={RefreshCw} label="패러프레이징" color="border-l-cyan-500">
            <div className="space-y-1.5">
              {expression.paraphrasing.map((p, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="flex-shrink-0 text-cyan-500 dark:text-cyan-400 text-xs mt-0.5">&#9656;</span>
                  <p className="text-sm leading-relaxed text-foreground">{p}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 비교 표현 */}
        {expression.comparisons && expression.comparisons.length > 0 && (
          <Section icon={GitCompare} label="비교 표현" color="border-l-orange-500">
            <div className="space-y-1.5">
              {expression.comparisons.map((c, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="flex-shrink-0 text-orange-500 dark:text-orange-400 text-xs mt-0.5">&#9656;</span>
                  <p className="text-sm leading-relaxed text-foreground">{c}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 예문 (대화 형식) */}
        {expression.example_sentence && (
          <Section icon={Quote} label="예문" color="border-l-indigo-500">
            <div className="border-l-2 border-indigo-300 dark:border-indigo-700 pl-4 space-y-1">
              <p className="text-[15px] leading-relaxed text-foreground font-medium whitespace-pre-line">
                {expression.example_sentence}
              </p>
              {expression.example_translation && (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {expression.example_translation}
                </p>
              )}
            </div>
          </Section>
        )}
      </CardContent>
    </Card>
  )
}

function Section({
  icon: Icon,
  label,
  color,
  children,
}: {
  icon: React.ElementType
  label: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className={`border-l-[3px] ${color} pl-4`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground/70">{label}</p>
      </div>
      {children}
    </div>
  )
}
