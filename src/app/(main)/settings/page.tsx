'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Flower2, TreePine, Leaf, Snowflake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuthContext } from '@/components/providers/auth-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { toast } from '@/hooks/use-toast'
import type { SeasonTheme } from '@/types/database'

const SEASON_THEMES: { value: SeasonTheme; label: string; sub: string; icon: React.ElementType; colors: [string, string, string] }[] = [
  { value: 'spring', label: 'Blossom Blink', sub: '봄', icon: Flower2, colors: ['#E08E9D', '#F7D1D7', '#FFF9FA'] },
  { value: 'summer', label: 'Forest Fresh', sub: '여름', icon: TreePine, colors: ['#4F772D', '#90A955', '#F7FBF2'] },
  { value: 'fall', label: 'Maple Mute', sub: '가을', icon: Leaf, colors: ['#A0522D', '#D2B48C', '#FFFBF5'] },
  { value: 'winter', label: 'Midnight Ice', sub: '겨울', icon: Snowflake, colors: ['#1B263B', '#778DA9', '#F0F4F8'] },
]

export default function SettingsPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuthContext()
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

  const handleSeasonChange = useCallback(async (newSeason: SeasonTheme) => {
    setSeason(newSeason)
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
      </div>
    </div>
  )
}
