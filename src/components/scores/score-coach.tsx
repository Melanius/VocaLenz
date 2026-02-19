'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Target, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface GoalContext {
  targetScore: number | null
  targetDate: string | null
  studyHours: string | null
  weakAreas: string[]
  proxyLevel: string | null
}

interface ScoreCoachProps {
  hasScores: boolean
  onGoToList: () => void
  initialTargetScore?: number | null
  initialTargetDate?: string | null
}

const STUDY_HOURS_OPTIONS = [
  { value: '30분 미만', label: '30분 미만' },
  { value: '30분~1시간', label: '30분~1시간' },
  { value: '1~2시간', label: '1~2시간' },
  { value: '2~3시간', label: '2~3시간' },
  { value: '3시간 이상', label: '3시간 이상' },
]

const WEAK_AREAS = [
  { id: '청해', label: '청해' },
  { id: '어휘', label: '어휘' },
  { id: '문법', label: '문법' },
  { id: '독해', label: '독해' },
]

const PROXY_OPTIONS = [
  { value: '', label: '선택 안 함' },
  { value: '수능 영어 1등급', label: '수능 영어 1등급' },
  { value: '수능 영어 2등급', label: '수능 영어 2등급' },
  { value: '수능 영어 3등급', label: '수능 영어 3등급' },
  { value: '수능 영어 4등급', label: '수능 영어 4등급' },
  { value: '수능 영어 5등급 이하', label: '수능 영어 5등급 이하' },
  { value: 'TOEIC 900+', label: 'TOEIC 900점 이상' },
  { value: 'TOEIC 800~900', label: 'TOEIC 800~900점' },
  { value: 'TOEIC 700~800', label: 'TOEIC 700~800점' },
  { value: 'TOEIC 600~700', label: 'TOEIC 600~700점' },
  { value: 'TOEIC 600 미만', label: 'TOEIC 600점 미만' },
]

export function ScoreCoach({ hasScores, onGoToList, initialTargetScore, initialTargetDate }: ScoreCoachProps) {
  const [phase, setPhase] = useState<'goal' | 'chat'>('goal')
  const [goalContext, setGoalContext] = useState<GoalContext | null>(null)

  // 목표 폼 상태 (프로필 값으로 초기화)
  const [targetScore, setTargetScore] = useState(initialTargetScore != null ? String(initialTargetScore) : '')
  const [targetDate, setTargetDate] = useState(initialTargetDate || '')
  const [studyHours, setStudyHours] = useState('')
  const [weakAreas, setWeakAreas] = useState<string[]>([])
  const [proxyLevel, setProxyLevel] = useState('')

  // 채팅 상태
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const toggleWeakArea = (area: string) => {
    setWeakAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  const handleStartCoaching = async () => {
    const goal: GoalContext = {
      targetScore: targetScore ? parseInt(targetScore) : null,
      targetDate: targetDate || null,
      studyHours: studyHours || null,
      weakAreas,
      proxyLevel: proxyLevel || null,
    }

    // 프로필에 목표 점수/날짜 저장 (silent)
    if (targetScore || targetDate) {
      const profileUpdates: Record<string, unknown> = {}
      if (targetScore) profileUpdates.target_score = parseInt(targetScore)
      if (targetDate) profileUpdates.study_start_date = targetDate
      fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileUpdates),
      }).catch(() => {})
    }

    setGoalContext(goal)
    setPhase('chat')

    // 바로 첫 분석 요청
    setStreaming(true)
    const initMessages: ChatMessage[] = [
      { role: 'user', content: '제 TEPS 성적과 목표를 분석해 주세요.' },
    ]

    try {
      const res = await fetch('/api/scores/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: initMessages, goalContext: goal }),
      })

      if (!res.ok || !res.body) {
        setMessages([{ role: 'assistant', content: '코치 연결에 실패했습니다. 다시 시도해 주세요.' }])
        setStreaming(false)
        return
      }

      let assistantContent = ''
      setMessages([{ role: 'assistant', content: '' }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        assistantContent += text
        setMessages([{ role: 'assistant', content: assistantContent }])
      }
    } catch {
      setMessages([{ role: 'assistant', content: '네트워크 오류가 발생했습니다. 다시 시도해 주세요.' }])
    } finally {
      setStreaming(false)
    }
  }

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || streaming) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setStreaming(true)

    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const res = await fetch('/api/scores/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, goalContext }),
      })

      if (!res.ok || !res.body) {
        setMessages([...updatedMessages, { role: 'assistant', content: '응답을 받지 못했습니다. 다시 시도해 주세요.' }])
        setStreaming(false)
        return
      }

      let assistantContent = ''
      setMessages([...updatedMessages, { role: 'assistant', content: '' }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        assistantContent += text
        setMessages([...updatedMessages, { role: 'assistant', content: assistantContent }])
      }
    } catch {
      setMessages([...updatedMessages, { role: 'assistant', content: '네트워크 오류가 발생했습니다.' }])
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  // Phase 1: 목표 설정 폼
  if (phase === 'goal') {
    return (
      <div className="max-w-lg mx-auto py-6 px-2">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">AI 코칭 시작</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  목표를 입력하면 데이터 기반 맞춤 전략을 제시합니다
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 목표 점수 + 날짜 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target-score" className="text-sm font-medium">목표 총점</Label>
                <Input
                  id="target-score"
                  type="number"
                  min={0}
                  max={600}
                  placeholder="예: 450"
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">만점 600점</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-date" className="text-sm font-medium">목표 날짜</Label>
                <Input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>

            {/* 학습 시간 */}
            <div className="space-y-2">
              <Label htmlFor="study-hours" className="text-sm font-medium">하루 학습 가능 시간</Label>
              <select
                id="study-hours"
                value={studyHours}
                onChange={(e) => setStudyHours(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">선택하세요</option>
                {STUDY_HOURS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 취약 영역 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">체감 취약 영역 (복수 선택)</Label>
              <div className="flex flex-wrap gap-3">
                {WEAK_AREAS.map((area) => (
                  <label
                    key={area.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={weakAreas.includes(area.id)}
                      onCheckedChange={() => toggleWeakArea(area.id)}
                    />
                    <span className="text-sm">{area.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 성적 없을 때: 대체 정보 */}
            {!hasScores && (
              <div className="space-y-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  성적 데이터가 없어도 코칭을 받을 수 있습니다
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  아래 정보를 선택하면 AI가 추정 레벨을 기반으로 분석합니다.
                  정확한 분석을 원하시면 성적을 먼저 입력해 주세요.
                </p>
                <Label htmlFor="proxy-level" className="text-sm font-medium">영어 수준 참고 (선택)</Label>
                <select
                  id="proxy-level"
                  value={proxyLevel}
                  onChange={(e) => setProxyLevel(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {PROXY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 text-xs h-auto"
                  onClick={onGoToList}
                >
                  성적 입력하러 가기 →
                </Button>
              </div>
            )}

            {/* 시작 버튼 */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleStartCoaching}
              disabled={!targetScore}
            >
              <Brain className="h-4 w-4 mr-2" />
              분석 시작
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Phase 2: 채팅
  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* 채팅 영역 */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 p-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed">
                    {msg.content ? (
                      <FormattedText text={msg.content} />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        분석 중...
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 입력 영역 */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="추가 질문을 입력하세요..."
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
          >
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 간단한 마크다운 렌더링 (볼드, 리스트, 줄바꿈) */
function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim()

        if (!trimmed) return <br key={i} />

        const listMatch = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+[.)]\s+(.+)$/)
        if (listMatch) {
          return (
            <div key={i} className="flex gap-2 ml-1 my-0.5">
              <span className="text-muted-foreground shrink-0">•</span>
              <span><InlineFormat text={listMatch[1]} /></span>
            </div>
          )
        }

        const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/)
        if (headingMatch) {
          return <p key={i} className="font-semibold mt-3 mb-1"><InlineFormat text={headingMatch[1]} /></p>
        }

        return <p key={i} className="my-0.5"><InlineFormat text={trimmed} /></p>
      })}
    </>
  )
}

/** 인라인 서식 (볼드) */
function InlineFormat({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) => {
        const boldMatch = part.match(/^\*\*(.+)\*\*$/)
        if (boldMatch) {
          return <strong key={i} className="font-semibold">{boldMatch[1]}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
