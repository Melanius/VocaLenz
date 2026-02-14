'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // SSR-safe: 클라이언트에서만 supabase 인스턴스 생성
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null
    return createClient()
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!supabase || !mounted) {
      setLoading(false)
      return
    }

    // 초기 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Auth 상태 변화 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, mounted])

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user,
  }
}
