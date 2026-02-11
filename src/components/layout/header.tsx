'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">VocaLenz</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/search"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              단어 검색
            </Link>
            <Link
              href="/vocabulary"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              내 단어장
            </Link>
            <Link
              href="/quiz"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              퀴즈
            </Link>
            <Link
              href="/chat"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              AI 채팅
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="sm">
            로그인
          </Button>
        </div>
      </div>
    </header>
  )
}
