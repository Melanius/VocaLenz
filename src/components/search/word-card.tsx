'use client'

import { Volume2, Star, Lightbulb, BookOpen, Target, Quote, RefreshCw, GitCompare, FileText, ArrowLeftRight, ArrowRightLeft } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePronunciation } from '@/hooks/use-pronunciation'
import { useDisplayPreferences } from '@/hooks/use-display-preferences'
import { useVocabularyContext } from '@/contexts/vocabulary-context'
import { useAuthContext } from '@/components/providers/auth-provider'
import { toast } from '@/hooks/use-toast'
import type { Word, WordCardField } from '@/types/database'

interface WordCardProps {
  word: Word
  showVocabularyButton?: boolean
}

const FIELD_CONFIG: Record<WordCardField, { label: string; color: string; icon: React.ElementType }> = {
  meanings: { label: '한글 뜻', color: 'border-l-emerald-500', icon: BookOpen },
  description: { label: '한국어 설명', color: 'border-l-blue-500', icon: FileText },
  description_en: { label: '영어 설명', color: 'border-l-slate-400', icon: FileText },
  image_text: { label: '연상 이미지', color: 'border-l-amber-500', icon: Lightbulb },
  teps_point: { label: 'TEPS 포인트', color: 'border-l-violet-500', icon: Target },
  synonyms: { label: '유의어', color: 'border-l-teal-500', icon: ArrowRightLeft },
  antonyms: { label: '반의어', color: 'border-l-rose-500', icon: ArrowLeftRight },
  paraphrasing: { label: '패러프레이징', color: 'border-l-cyan-500', icon: RefreshCw },
  comparisons: { label: '비교 표현', color: 'border-l-orange-500', icon: GitCompare },
  example: { label: '예문', color: 'border-l-indigo-500', icon: Quote },
}

export function WordCard({ word, showVocabularyButton = true }: WordCardProps) {
  const { speak } = usePronunciation()
  const { preferences } = useDisplayPreferences()
  const { user } = useAuthContext()
  const { isInVocabulary, addToVocabulary, removeFromVocabulary } = useVocabularyContext()

  const inVocab = user ? isInVocabulary(word.id) : false

  const handleVocabularyToggle = async () => {
    if (!user) return
    const result = inVocab
      ? await removeFromVocabulary(word.id)
      : await addToVocabulary(word.id)
    toast({
      title: result.success ? (inVocab ? '제거 완료' : '추가 완료') : '오류',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    })
  }

  const renderField = (field: WordCardField) => {
    if (!preferences.visibleFields.includes(field)) return null
    const config = FIELD_CONFIG[field]

    switch (field) {
      case 'meanings':
        return word.meanings && word.meanings.length > 0 ? (
          <Section key={field} config={config}>
            <ol className="space-y-1.5">
              {word.meanings.map((m, i) => (
                <li key={i} className="flex items-baseline gap-2 text-base leading-relaxed">
                  <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-foreground font-medium">{m}</span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null

      case 'description':
        return word.description ? (
          <Section key={field} config={config}>
            <p className="text-[15px] leading-relaxed text-foreground">{word.description}</p>
          </Section>
        ) : null

      case 'description_en':
        return word.description_en ? (
          <Section key={field} config={config}>
            <p className="text-sm leading-relaxed text-muted-foreground italic">{word.description_en}</p>
          </Section>
        ) : null

      case 'image_text':
        return word.image_text ? (
          <Section key={field} config={config}>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3.5">
              <p className="text-[15px] leading-relaxed text-amber-900 dark:text-amber-200">
                {word.image_text}
              </p>
            </div>
          </Section>
        ) : null

      case 'teps_point':
        return word.teps_point ? (
          <Section key={field} config={config}>
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-3.5">
              <p className="text-[15px] leading-relaxed text-violet-900 dark:text-violet-200">
                {word.teps_point}
              </p>
            </div>
          </Section>
        ) : null

      case 'synonyms':
        return word.synonyms.length > 0 ? (
          <Section key={field} config={config}>
            <div className="flex flex-wrap gap-2">
              {word.synonyms.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </Section>
        ) : null

      case 'antonyms':
        return word.antonyms.length > 0 ? (
          <Section key={field} config={config}>
            <div className="flex flex-wrap gap-2">
              {word.antonyms.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                >
                  {a}
                </span>
              ))}
            </div>
          </Section>
        ) : null

      case 'paraphrasing':
        return word.paraphrasing.length > 0 ? (
          <Section key={field} config={config}>
            <div className="space-y-1.5">
              {word.paraphrasing.map((p, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="flex-shrink-0 text-cyan-500 dark:text-cyan-400 text-xs mt-0.5">▸</span>
                  <p className="text-sm leading-relaxed text-foreground">{p}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null

      case 'comparisons':
        return word.comparisons.length > 0 ? (
          <Section key={field} config={config}>
            <div className="space-y-1.5">
              {word.comparisons.map((c, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="flex-shrink-0 text-orange-500 dark:text-orange-400 text-xs mt-0.5">▸</span>
                  <p className="text-sm leading-relaxed text-foreground">{c}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null

      case 'example':
        return word.example_sentence ? (
          <Section key={field} config={config}>
            <div className="border-l-2 border-indigo-300 dark:border-indigo-700 pl-4 space-y-1">
              <p className="text-[15px] leading-relaxed text-foreground font-medium">
                {word.example_sentence}
              </p>
              {word.example_translation && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {word.example_translation}
                </p>
              )}
            </div>
          </Section>
        ) : null

      default:
        return null
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user && showVocabularyButton && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full -ml-1"
                onClick={handleVocabularyToggle}
                aria-label={inVocab ? '단어장에서 제거' : '단어장에 추가'}
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
            <h3 className="text-3xl font-extrabold text-foreground tracking-tight">{word.word}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => speak(word.word)}
              aria-label="발음 듣기"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {word.part_of_speech &&
              word.part_of_speech.split('/').map((pos, i) => (
                <Badge key={i} variant="outline" className="text-xs font-semibold">
                  {pos.trim()}
                </Badge>
              ))}
            <LevelBadge level={word.difficulty_level} />
          </div>
        </div>
        {word.pronunciation && (
          <p className="text-base text-muted-foreground mt-1">{word.pronunciation}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        {preferences.fieldOrder
          .map((field) => renderField(field))
          .filter(Boolean)}
      </CardContent>
    </Card>
  )
}

interface SectionConfig {
  label: string
  color: string
  icon: React.ElementType
}

function Section({ config, children }: { config: SectionConfig; children: React.ReactNode }) {
  const Icon = config.icon
  return (
    <div className={`border-l-[3px] ${config.color} pl-4`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground/70">{config.label}</p>
      </div>
      {children}
    </div>
  )
}

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Essential', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  2: { label: 'Core', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  3: { label: 'Advanced', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  4: { label: 'Killer', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

function LevelBadge({ level }: { level: number }) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[2]
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${config.color}`}>
      Lv.{level} {config.label}
    </span>
  )
}
