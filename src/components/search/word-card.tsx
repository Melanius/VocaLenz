'use client'

import { Volume2, Star } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { usePronunciation } from '@/hooks/use-pronunciation'
import { useDisplayPreferences } from '@/hooks/use-display-preferences'
import { useVocabulary } from '@/hooks/use-vocabulary'
import { useAuthContext } from '@/components/providers/auth-provider'
import { toast } from '@/hooks/use-toast'
import type { Word, WordCardField } from '@/types/database'

interface WordCardProps {
  word: Word
  showVocabularyButton?: boolean
}

const FIELD_LABELS: Record<WordCardField, string> = {
  meanings: '한글 뜻',
  description: '한국어 설명',
  description_en: '영어 설명',
  image_text: '연상 이미지',
  teps_point: 'TEPS 포인트',
  synonyms: '유의어',
  antonyms: '반의어',
  paraphrasing: '패러프레이징',
  comparisons: '비교 표현',
  example: '예문',
}

export function WordCard({ word, showVocabularyButton = true }: WordCardProps) {
  const { speak } = usePronunciation()
  const { preferences } = useDisplayPreferences()
  const { user } = useAuthContext()
  const { isInVocabulary, addToVocabulary, removeFromVocabulary } = useVocabulary()

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

    switch (field) {
      case 'meanings':
        return word.meanings && word.meanings.length > 0 ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <ol className="space-y-0.5">
              {word.meanings.map((m, i) => (
                <li key={i} className="text-sm text-foreground">
                  <span className="text-muted-foreground mr-1">{i + 1}.</span>
                  {m}
                </li>
              ))}
            </ol>
          </Section>
        ) : null

      case 'description':
        return word.description ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <p className="text-foreground">{word.description}</p>
          </Section>
        ) : null

      case 'description_en':
        return word.description_en ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <p className="text-foreground italic">{word.description_en}</p>
          </Section>
        ) : null

      case 'image_text':
        return word.image_text ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <p className="text-foreground bg-accent/50 rounded-lg p-3 text-sm">
              {word.image_text}
            </p>
          </Section>
        ) : null

      case 'teps_point':
        return word.teps_point ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <p className="text-foreground text-sm">{word.teps_point}</p>
          </Section>
        ) : null

      case 'synonyms':
        return word.synonyms.length > 0 ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <div className="flex flex-wrap gap-1.5">
              {word.synonyms.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </Section>
        ) : null

      case 'antonyms':
        return word.antonyms.length > 0 ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <div className="flex flex-wrap gap-1.5">
              {word.antonyms.map((a, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {a}
                </Badge>
              ))}
            </div>
          </Section>
        ) : null

      case 'paraphrasing':
        return word.paraphrasing.length > 0 ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <ul className="space-y-1 text-sm text-foreground">
              {word.paraphrasing.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </Section>
        ) : null

      case 'comparisons':
        return word.comparisons.length > 0 ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <ul className="space-y-1 text-sm text-foreground">
              {word.comparisons.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </Section>
        ) : null

      case 'example':
        return word.example_sentence ? (
          <Section key={field} label={FIELD_LABELS[field]}>
            <p className="text-foreground text-sm italic">{word.example_sentence}</p>
            {word.example_translation && (
              <p className="text-muted-foreground text-sm mt-1">{word.example_translation}</p>
            )}
          </Section>
        ) : null

      default:
        return null
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
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
            <h3 className="text-2xl font-bold text-foreground">{word.word}</h3>
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
                <Badge key={i} variant="outline" className="text-xs">
                  {pos.trim()}
                </Badge>
              ))}
            <LevelBadge level={word.difficulty_level} />
          </div>
        </div>
        {word.pronunciation && (
          <p className="text-sm text-muted-foreground">[{word.pronunciation}]</p>
        )}
      </CardHeader>
      <CardContent className="space-y-0">
        {preferences.fieldOrder
          .map((field) => renderField(field))
          .filter(Boolean)
          .map((element, index, arr) => (
            <div key={index}>
              {element}
              {index < arr.length - 1 && <Separator className="my-3" />}
            </div>
          ))}
      </CardContent>
    </Card>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
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
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${config.color}`}>
      Lv.{level} {config.label}
    </span>
  )
}
