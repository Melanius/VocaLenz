'use client'

import { getSessionId } from '@/lib/session'

interface AnalyticsEvent {
  sessionId: string
  page: string
  action: string
  metadata?: Record<string, unknown>
}

const BATCH_SIZE = 5
const FLUSH_INTERVAL = 5000 // 5초
const ENDPOINT = '/api/analytics'

class Analytics {
  private queue: AnalyticsEvent[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private initialized = false

  init() {
    if (this.initialized || typeof window === 'undefined') return
    this.initialized = true

    // 주기적 배치 전송
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL)

    // 페이지 이탈 시 sendBeacon으로 전송
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushBeacon()
      }
    })

    window.addEventListener('pagehide', () => {
      this.flushBeacon()
    })
  }

  track(action: string, metadata?: Record<string, unknown>, page?: string) {
    if (typeof window === 'undefined') return

    this.init()

    this.queue.push({
      sessionId: getSessionId(),
      page: page || window.location.pathname,
      action,
      metadata,
    })

    if (this.queue.length >= BATCH_SIZE) {
      this.flush()
    }
  }

  private async flush() {
    if (this.queue.length === 0) return

    const events = [...this.queue]
    this.queue = []

    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      })
    } catch {
      // 실패 시 큐에 다시 추가 (최대 50개 유지)
      this.queue = [...events, ...this.queue].slice(0, 50)
    }
  }

  private flushBeacon() {
    if (this.queue.length === 0) return

    const events = [...this.queue]
    this.queue = []

    const blob = new Blob(
      [JSON.stringify({ events })],
      { type: 'application/json' }
    )
    navigator.sendBeacon(ENDPOINT, blob)
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.flush()
    this.initialized = false
  }
}

// 싱글턴
export const analytics = new Analytics()
