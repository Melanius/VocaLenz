'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">문제가 발생했습니다</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        일시적인 오류가 발생했습니다. 다시 시도해 주세요.
      </p>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RotateCcw className="h-4 w-4" />
        다시 시도
      </Button>
    </div>
  )
}
