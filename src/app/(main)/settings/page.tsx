'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Flower2, TreePine, Leaf, Snowflake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuthContext } from '@/components/providers/auth-provider'
import { useDisplayPreferences } from '@/hooks/use-display-preferences'
import { useTheme } from '@/components/providers/theme-provider'
import { toast } from '@/hooks/use-toast'
import type { WordCardField, SeasonTheme } from '@/types/database'

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

const SEASON_THEMES: { value: SeasonTheme; label: string; sub: string; icon: React.ElementType; colors: [string, string, string] }[] = [
  { value: 'spring', label: 'Blossom Blink', sub: '봄', icon: Flower2, colors: ['#E08E9D', '#F7D1D7', '#FFF9FA'] },
  { value: 'summer', label: 'Forest Fresh', sub: '여름', icon: TreePine, colors: ['#4F772D', '#90A955', '#F7FBF2'] },
  { value: 'fall', label: 'Maple Mute', sub: '가을', icon: Leaf, colors: ['#A0522D', '#D2B48C', '#FFFBF5'] },
  { value: 'winter', label: 'Midnight Ice', sub: '겨울', icon: Snowflake, colors: ['#1B263B', '#778DA9', '#F0F4F8'] },
]

export default function SettingsPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuthContext()
  const { preferences, updatePreferences } = useDisplayPreferences()
  const { season, setSeason } = useTheme()
  const router = useRouter()

  // 프로필 폼
  const [nickname, setNickname] = useState('')
  const [targetScore, setTargetScore] = useState('')
  const [goalMessage, setGoalMessage] = useState('')
  const [studyStartDate, setStudyStartDate] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // 표시 설정
  const [localVisible, setLocalVisible] = useState<WordCardField[]>(preferences.visibleFields)
  const [localOrder, setLocalOrder] = useState<WordCardField[]>(preferences.fieldOrder)
  const [displaySaving, setDisplaySaving] = useState(false)

  // 프로필 데이터 로드
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '')
      setTargetScore(profile.target_score?.toString() || '')
      setGoalMessage(profile.goal_message || '')
      setStudyStartDate(profile.study_start_date || '')
      setBirthDate(profile.birth_date || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  // 표시 설정 동기화
  useEffect(() => {
    setLocalVisible(preferences.visibleFields)
    setLocalOrder(preferences.fieldOrder)
  }, [preferences.visibleFields, preferences.fieldOrder])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localOrder.indexOf(active.id as WordCardField)
    const newIndex = localOrder.indexOf(over.id as WordCardField)
    setLocalOrder(arrayMove(localOrder, oldIndex, newIndex))
  }

  const handleFieldToggle = (field: WordCardField) => {
    setLocalVisible((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname || null,
          target_score: targetScore ? parseInt(targetScore) : null,
          goal_message: goalMessage || null,
          study_start_date: studyStartDate || null,
          birth_date: birthDate || null,
          phone: phone || null,
        }),
      })
      if (res.ok) {
        toast({ title: '프로필이 저장되었습니다.' })
        refreshProfile()
      } else {
        toast({ title: '저장 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSaveDisplay = () => {
    setDisplaySaving(true)
    updatePreferences({ visibleFields: localVisible, fieldOrder: localOrder })
    toast({ title: '표시 설정이 저장되었습니다.' })
    setTimeout(() => setDisplaySaving(false), 300)
  }

  const handleSeasonChange = useCallback(async (newSeason: SeasonTheme) => {
    setSeason(newSeason)
    // DB에도 저장
    try {
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newSeason }),
      })
    } catch {
      // localStorage만으로 동작
    }
  }, [setSeason])

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    router.push('/auth/login')
    return null
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">설정</h1>

        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">닉네임</Label>
                <Input
                  id="nickname"
                  placeholder="표시될 이름"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-score">목표 TEPS 점수</Label>
                <Input
                  id="target-score"
                  type="number"
                  min={0}
                  max={600}
                  placeholder="예: 450"
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-message">다짐 한마디</Label>
              <Input
                id="goal-message"
                placeholder="예: 이번 시험에서 반드시 450점 넘기기!"
                value={goalMessage}
                onChange={(e) => setGoalMessage(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="study-start">목표 달성일</Label>
              <Input
                id="study-start"
                type="date"
                value={studyStartDate}
                onChange={(e) => setStudyStartDate(e.target.value)}
              />
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground">선택 입력</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth-date">생년월일</Label>
                <Input
                  id="birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">핸드폰 번호</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={13}
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={profileSaving} className="w-full">
              {profileSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              프로필 저장
            </Button>
          </CardContent>
        </Card>

        {/* 계절 테마 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">테마</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {SEASON_THEMES.map((t) => {
                const Icon = t.icon
                const isActive = season === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => handleSeasonChange(t.value)}
                    className={`relative flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: t.colors[1] }}
                    >
                      <Icon className="h-5 w-5" style={{ color: t.colors[0] }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.sub}</p>
                    </div>
                    {isActive && (
                      <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-1.5 mt-3">
              {SEASON_THEMES.find((t) => t.value === season)?.colors.map((color, i) => (
                <div
                  key={i}
                  className="h-4 flex-1 rounded-full border"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 단어 카드 표시 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">단어 카드 표시 설정</CardTitle>
            <p className="text-xs text-muted-foreground">
              검색 결과와 단어장 상세에 모두 적용됩니다
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {localOrder.map((field) => (
                    <SortableFieldItem
                      key={field}
                      field={field}
                      label={FIELD_LABELS[field]}
                      checked={localVisible.includes(field)}
                      onToggle={() => handleFieldToggle(field)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button onClick={handleSaveDisplay} disabled={displaySaving} className="w-full">
              {displaySaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              표시 설정 저장
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SortableFieldItem({
  field,
  label,
  checked,
  onToggle,
}: {
  field: WordCardField
  label: string
  checked: boolean
  onToggle: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border bg-card ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label={`${label} 순서 변경`}
      >
        ⠿
      </button>
      <Checkbox
        id={`settings-field-${field}`}
        checked={checked}
        onCheckedChange={onToggle}
      />
      <Label
        htmlFor={`settings-field-${field}`}
        className="text-sm cursor-pointer flex-1"
      >
        {label}
      </Label>
    </div>
  )
}
