'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ScoreCoachProps {
  hasScores: boolean
  onGoToList: () => void
}

export function ScoreCoach({ hasScores, onGoToList }: ScoreCoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [initialized, setInitialized] = useState(false)
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

  // 첫 진입 시 AI 인사 메시지 요청
  useEffect(() => {
    if (!hasScores || initialized) return
    setInitialized(true)

    const initChat = async () => {
      setStreaming(true)
      const initMessages: ChatMessage[] = [
        { role: 'user', content: '안녕하세요. 제 TEPS 성적을 분석하고 학습 전략을 코칭해 주세요.' },
      ]

      try {
        const res = await fetch('/api/scores/consult', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: initMessages }),
        })

        if (!res.ok || !res.body) {
          setMessages([{ role: 'assistant', content: '죄송합니다. 코치 연결에 실패했습니다. 다시 시도해 주세요.' }])
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

    initChat()
  }, [hasScores, initialized])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || streaming) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setStreaming(true)

    // textarea 높이 리셋
    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const res = await fetch('/api/scores/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
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
    // 자동 높이 조절
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  if (!hasScores) {
    return (
      <div className="text-center py-16 space-y-3">
        <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">코칭을 받으려면 성적을 먼저 입력해 주세요.</p>
        <Button variant="outline" size="sm" onClick={onGoToList}>
          성적 입력하기
        </Button>
      </div>
    )
  }

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
                        작성 중...
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
            placeholder="메시지를 입력하세요..."
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

        // 빈 줄
        if (!trimmed) return <br key={i} />

        // 리스트 아이템 (-, *, 숫자.)
        const listMatch = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+[.)]\s+(.+)$/)
        if (listMatch) {
          return (
            <div key={i} className="flex gap-2 ml-1 my-0.5">
              <span className="text-muted-foreground shrink-0">•</span>
              <span><InlineFormat text={listMatch[1]} /></span>
            </div>
          )
        }

        // 헤딩 (### 등)
        const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/)
        if (headingMatch) {
          return <p key={i} className="font-semibold mt-3 mb-1"><InlineFormat text={headingMatch[1]} /></p>
        }

        // 일반 텍스트
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
