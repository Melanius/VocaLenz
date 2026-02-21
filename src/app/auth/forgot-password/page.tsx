'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    if (error) {
      setError('이메일 전송에 실패했습니다. 가입 시 사용한 이메일을 확인해 주세요.')
      setIsLoading(false)
    } else {
      setSent(true)
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 space-y-5 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">이메일을 확인해 주세요</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span>으로<br />
              비밀번호 재설정 링크를 보냈습니다.<br />
              링크를 클릭하면 새 비밀번호를 설정할 수 있어요.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            이메일이 오지 않으면 스팸함을 확인하거나 잠시 후 다시 시도해 주세요.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">로그인으로 돌아가기</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="space-y-1">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            로그인으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold">비밀번호 찾기</h1>
          <p className="text-sm text-muted-foreground">
            가입한 이메일을 입력하시면 재설정 링크를 보내드립니다.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? '전송 중...' : '재설정 링크 보내기'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
