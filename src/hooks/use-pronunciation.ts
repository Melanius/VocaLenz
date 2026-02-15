'use client'

import { useCallback, useRef } from 'react'
import { analytics } from '@/lib/analytics'

export function usePronunciation() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((word: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    // 이전 발음 중단
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utteranceRef.current = utterance

    window.speechSynthesis.speak(utterance)
    analytics.track('pronunciation_play', { word })
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
  }, [])

  return { speak, stop }
}
