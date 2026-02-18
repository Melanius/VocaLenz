'use client'

import { useState, useCallback } from 'react'
import { Search, BookOpen, Brain, BarChart3, Palette, ChevronLeft, ChevronRight, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthContext } from '@/components/providers/auth-provider'
import { toast } from '@/hooks/use-toast'

// --- Step 1: 환영 + 성적/목표 입력 ---

type ScoreBranch = null | 'yes' | 'no'

interface ScoreForm {
  total: string
  listening: string
  vocabulary: string
  grammar: string
  reading: string
}

interface GoalForm {
  targetScore: string
  targetDate: string
}

function WelcomeStep({
  nickname,
  onComplete,
}: {
  nickname: string
  onComplete: () => void
}) {
  const [branch, setBranch] = useState<ScoreBranch>(null)
  const [scoreForm, setScoreForm] = useState<ScoreForm>({
    total: '', listening: '', vocabulary: '', grammar: '', reading: '',
  })
  const [goalForm, setGoalForm] = useState<GoalForm>({
    targetScore: '', targetDate: '',
  })
  const [saving, setSaving] = useState(false)

  const handleScoreSubmit = async () => {
    if (!scoreForm.total) return
    setSaving(true)
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total: parseInt(scoreForm.total),
          listening: scoreForm.listening ? parseInt(scoreForm.listening) : null,
          vocabulary: scoreForm.vocabulary ? parseInt(scoreForm.vocabulary) : null,
          grammar: scoreForm.grammar ? parseInt(scoreForm.grammar) : null,
          reading: scoreForm.reading ? parseInt(scoreForm.reading) : null,
          exam_date: new Date().toISOString().split('T')[0],
        }),
      })
      if (res.ok) {
        toast({ title: '성적이 저장되었습니다!' })
        onComplete()
      } else {
        toast({ title: '저장 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '네트워크 오류', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleGoalSubmit = async () => {
    setSaving(true)
    try {
      const updates: Record<string, unknown> = {}
      if (goalForm.targetScore) updates.target_score = parseInt(goalForm.targetScore)
      if (goalForm.targetDate) updates.study_start_date = goalForm.targetDate

      if (Object.keys(updates).length > 0) {
        await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      }
      onComplete()
    } catch {
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  // 초기 화면: 성적 유무 질문
  if (branch === null) {
    return (
      <div className="flex flex-col items-center text-center px-6 py-8">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-1">환영합니다!</h2>
        <p className="text-lg font-semibold text-primary mb-6">{nickname}님</p>
        <p className="text-sm text-muted-foreground mb-8">
          학습을 시작하기 전에 간단한 설정을 해볼까요?
        </p>
        <p className="text-sm font-medium mb-4">TEPS 성적이 있으신가요?</p>
        <div className="flex gap-3 w-full max-w-xs">
          <Button onClick={() => setBranch('yes')} className="flex-1">예</Button>
          <Button onClick={() => setBranch('no')} variant="outline" className="flex-1">아니요</Button>
        </div>
      </div>
    )
  }

  // "예" 선택: 성적 입력
  if (branch === 'yes') {
    return (
      <div className="flex flex-col px-6 py-6">
        <h2 className="text-lg font-bold mb-1 text-center">가장 최근 TEPS 성적</h2>
        <p className="text-xs text-muted-foreground text-center mb-5">총점만 입력해도 괜찮아요</p>

        <div className="space-y-3 max-w-xs mx-auto w-full">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">총점 (필수)</Label>
            <Input
              type="number"
              min={0}
              max={600}
              placeholder="예: 350"
              value={scoreForm.total}
              onChange={(e) => setScoreForm((p) => ({ ...p, total: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'listening', label: '청해', max: 240 },
              { key: 'vocabulary', label: '어휘', max: 60 },
              { key: 'grammar', label: '문법', max: 60 },
              { key: 'reading', label: '독해', max: 240 },
            ].map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{f.label} (선택)</Label>
                <Input
                  type="number"
                  min={0}
                  max={f.max}
                  placeholder={`0~${f.max}`}
                  value={scoreForm[f.key as keyof ScoreForm]}
                  onChange={(e) => setScoreForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-6 max-w-xs mx-auto w-full">
          <Button variant="ghost" onClick={onComplete} className="flex-1 text-muted-foreground" disabled={saving}>
            건너뛰기
          </Button>
          <Button onClick={handleScoreSubmit} disabled={!scoreForm.total || saving} className="flex-1">
            {saving ? '저장 중...' : '완료'}
          </Button>
        </div>
      </div>
    )
  }

  // "아니요" 선택: 목표 설정
  return (
    <div className="flex flex-col items-center px-6 py-6">
      <div className="text-3xl mb-3">🎯</div>
      <h2 className="text-lg font-bold mb-1">목표를 설정해볼까요?</h2>
      <p className="text-xs text-muted-foreground mb-5">나중에 설정에서 변경할 수 있어요</p>

      <div className="space-y-3 max-w-xs w-full">
        <div className="space-y-1">
          <Label className="text-xs">목표 점수</Label>
          <Input
            type="number"
            min={0}
            max={600}
            placeholder="예: 450"
            value={goalForm.targetScore}
            onChange={(e) => setGoalForm((p) => ({ ...p, targetScore: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">달성 목표일</Label>
          <Input
            type="date"
            value={goalForm.targetDate}
            onChange={(e) => setGoalForm((p) => ({ ...p, targetDate: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-6 max-w-xs w-full">
        <Button variant="ghost" onClick={onComplete} className="flex-1 text-muted-foreground" disabled={saving}>
          건너뛰기
        </Button>
        <Button onClick={handleGoalSubmit} disabled={saving} className="flex-1">
          {saving ? '저장 중...' : '다음'}
        </Button>
      </div>
    </div>
  )
}

// --- Step 2: 기능 소개 슬라이드 ---

const FEATURE_SLIDES = [
  {
    icon: Search,
    emoji: '🔍',
    title: '단어 검색',
    lines: [
      'AI가 단어 뜻, 예문, 유의어를 한 번에 정리해줘요.',
      '최대 4개까지 동시 검색 가능!',
      '설정에서 보고 싶은 항목만 골라볼 수 있어요.',
    ],
  },
  {
    icon: BookOpen,
    emoji: '📚',
    title: '내 단어장',
    lines: [
      '검색한 단어는 자동으로 단어장에 저장돼요.',
      '카드를 탭하면 뒤집어서 뜻을 확인할 수 있어요.',
      '암기 완료, 복습 필요 표시로 학습을 관리하세요.',
    ],
  },
  {
    icon: Brain,
    emoji: '🧠',
    title: '단어 퀴즈',
    lines: [
      '내 단어장에서 랜덤으로 퀴즈가 출제돼요.',
      '틀린 단어는 자동으로 복습 표시!',
      '반복 학습으로 어휘력을 키워보세요.',
    ],
  },
  {
    icon: BarChart3,
    emoji: '📊',
    title: '성적 관리 & AI 코칭',
    lines: [
      'TEPS 성적을 기록하고 추이를 한눈에 확인하세요.',
      'AI가 성적을 분석하고 맞춤 학습 전략을 제안해줘요.',
    ],
  },
  {
    icon: Palette,
    emoji: '🎨',
    title: '테마 설정',
    lines: [
      '프로필 아이콘을 눌러 설정에 들어갈 수 있어요.',
      '봄, 여름, 가을, 겨울 테마로 분위기를 바꿔보세요!',
    ],
  },
]

function FeatureSlidesStep({ onComplete }: { onComplete: () => void }) {
  const [current, setCurrent] = useState(0)
  const slide = FEATURE_SLIDES[current]
  const isLast = current === FEATURE_SLIDES.length - 1

  return (
    <div className="flex flex-col items-center px-6 py-6 min-h-[360px]">
      {/* 슬라이드 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-sm">
        <div className="text-5xl mb-4">{slide.emoji}</div>
        <h2 className="text-lg font-bold mb-3">{slide.title}</h2>
        <div className="space-y-1.5">
          {slide.lines.map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>
          ))}
        </div>
      </div>

      {/* 하단: dots + 버튼 */}
      <div className="w-full max-w-sm mt-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {FEATURE_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${
                i === current ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrent((c) => c - 1)}
            disabled={current === 0}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {isLast ? (
            <Button onClick={onComplete} className="flex-1 gap-2">
              <Rocket className="h-4 w-4" />
              시작하기
            </Button>
          ) : (
            <Button onClick={() => setCurrent((c) => c + 1)} variant="outline" className="flex-1 gap-2">
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrent((c) => c + 1)}
            disabled={isLast}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- 메인 온보딩 모달 ---

type OnboardingStep = 'welcome' | 'features'

export function OnboardingModal() {
  const { profile, refreshProfile } = useAuthContext()
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [visible, setVisible] = useState(true)

  const displayName = profile?.nickname || profile?.name || '사용자'

  const handleWelcomeComplete = useCallback(() => {
    setStep('features')
  }, [])

  const handleFinish = useCallback(async () => {
    setVisible(false)
    try {
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      })
      await refreshProfile()
    } catch {
      // silent
    }
  }, [refreshProfile])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border">
        {/* 상단 진행 바 */}
        <div className="flex items-center gap-1 px-5 pt-4">
          <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'welcome' ? 'bg-primary' : 'bg-primary'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'features' ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {/* 건너뛰기 (기능 소개에서만) */}
        {step === 'features' && (
          <div className="flex justify-end px-5 pt-2">
            <button
              onClick={handleFinish}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              건너뛰기
            </button>
          </div>
        )}

        {/* 콘텐츠 */}
        {step === 'welcome' ? (
          <WelcomeStep nickname={displayName} onComplete={handleWelcomeComplete} />
        ) : (
          <FeatureSlidesStep onComplete={handleFinish} />
        )}
      </div>
    </div>
  )
}
