'use client'

import { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateRandomNickname } from '@/lib/nickname-generator'
import type { User, Session } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const nicknameAssigned = useRef(false)

  // SSR-safe: 클라이언트에서만 supabase 인스턴스 생성
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null
    return createClient()
  }, [])

  const fetchProfile = async (userId: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      const profileData = data as UserProfile
      setProfile(profileData)

      // 닉네임이 없으면 자동 생성
      if (!profileData.nickname && !nicknameAssigned.current) {
        nicknameAssigned.current = true
        const nickname = generateRandomNickname()
        try {
          await fetch('/api/users/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname }),
          })
          setProfile({ ...profileData, nickname })
        } catch {
          // silent - 다음 로그인 시 재시도
        }
      }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  // 마운트 상태 확인
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

      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Auth 상태 변화 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, mounted])

  const value = {
    user,
    session,
    profile,
    loading,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
