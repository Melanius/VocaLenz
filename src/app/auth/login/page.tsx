'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

const SAVE_EMAIL_KEY = 'vocalenz_save_email'
const AUTO_LOGIN_KEY = 'vocalenz_auto_login'
const SAVED_EMAIL_KEY = 'vocalenz_saved_email'

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (msg.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 메일함을 확인해 주세요.'
  if (msg.includes('Too many requests')) return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  if (msg.includes('User not found')) return '등록되지 않은 이메일입니다.'
  return msg
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveEmail, setSaveEmail] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)

  useEffect(() => {
    const savedSaveEmail = localStorage.getItem(SAVE_EMAIL_KEY) === 'true'
    const savedAutoLogin = localStorage.getItem(AUTO_LOGIN_KEY) === 'true'
    const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY) || ''

    setSaveEmail(savedSaveEmail)
    setAutoLogin(savedAutoLogin)
    if (savedSaveEmail && savedEmail) setEmail(savedEmail)

    // 세션이 있으면 바로 홈으로 (자동 로그인 or 이미 로그인된 경우)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/')
      } else {
        setIsLoading(false)
      }
    })
  }, [router])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(translateError(error.message))
      setIsLoading(false)
    } else {
      localStorage.setItem(SAVE_EMAIL_KEY, String(saveEmail))
      localStorage.setItem(AUTO_LOGIN_KEY, String(autoLogin))
      if (saveEmail) {
        localStorage.setItem(SAVED_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY)
      }
      router.push('/')
      router.refresh()
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(translateError(error.message))
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">로그인</h1>
          <p className="text-sm text-muted-foreground">VocaLenz에 오신 것을 환영합니다</p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          {/* 이메일 */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
                className="pl-10"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
                autoComplete="current-password"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 암호 저장 / 자동 로그인 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={saveEmail}
                  onChange={(e) => setSaveEmail(e.target.checked)}
                  className="rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>암호 저장</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={autoLogin}
                  onChange={(e) => setAutoLogin(e.target.checked)}
                  className="rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>자동 로그인</span>
              </label>
            </div>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              비밀번호 찾기
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '이메일로 로그인'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google로 로그인
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{' '}
          <Link href="/auth/signup" className="text-primary hover:underline font-medium">
            회원가입
          </Link>
        </p>
      </Card>
    </div>
  )
}
