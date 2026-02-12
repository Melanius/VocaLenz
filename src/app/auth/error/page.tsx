import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">인증 오류</h1>
          <p className="text-muted-foreground">
            로그인 중 문제가 발생했습니다.
            <br />
            다시 시도해 주세요.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/auth/login">로그인 페이지로 이동</Link>
        </Button>
      </Card>
    </div>
  )
}
