'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Search, BookOpen, History, BarChart3, Brain, Menu, Settings, Shield, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthContext } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/', label: '단어 검색', icon: Search },
  { href: '/vocabulary', label: '내 단어장', icon: BookOpen },
  { href: '/quiz', label: '단어 퀴즈', icon: Brain },
  { href: '/history', label: '검색 이력', icon: History },
  { href: '/scores', label: '성적 관리', icon: BarChart3 },
]

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

export function Header() {
  const { user, profile, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleLogoClick = () => {
    window.dispatchEvent(new Event('vocalenz:reset-search'))
  }

  const displayName = profile?.nickname || profile?.name || user?.email?.split('@')[0] || ''

  // D-day 계산 (목표 달성일 기준)
  const dDay = (() => {
    if (!profile?.study_start_date) return null
    const target = new Date(profile.study_start_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)
    if (diff > 0) return `D-${diff}`
    if (diff === 0) return 'D-Day'
    return `D+${Math.abs(diff)}`
  })()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Left: Logo */}
        <div className="flex shrink-0">
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center"
          >
            <Image
              src="/logo/VocaLenz_logo_light.png"
              alt="VocaLenz"
              width={140}
              height={38}
              className="h-9 w-auto max-w-[140px] object-contain dark:hidden"
              priority
            />
            <Image
              src="/logo/VocaLenz_logo_dark.png"
              alt="VocaLenz"
              width={140}
              height={38}
              className="h-9 w-auto max-w-[140px] object-contain hidden dark:block"
              priority
            />
          </Link>
        </div>

        {/* Center: Desktop nav */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  relative px-3 py-1.5 text-sm rounded-md transition-colors duration-200
                  ${isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }
                `}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right: User area */}
        <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
          {loading ? (
            <div className="h-8 w-20 animate-pulse bg-muted rounded-full" />
          ) : user ? (
            <div className="flex items-center gap-1.5">
              {dDay && (
                <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/25 rounded-md px-2.5 py-1 inline-flex items-center leading-none tracking-wide">
                  {dDay}
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-accent/50 transition-colors outline-none">
                    <div
                      className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0"
                    >
                      {getInitial(displayName)}
                    </div>
                    <span className="text-sm text-foreground hidden sm:inline max-w-[100px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <div className="px-2 py-1.5 sm:hidden">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                </div>
                <DropdownMenuSeparator className="sm:hidden" />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    설정
                  </Link>
                </DropdownMenuItem>
                {profile?.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      관리자
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-muted-foreground">
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">로그인</Link>
            </Button>
          )}

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">메뉴</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {NAV_LINKS.map((link) => {
                  const Icon = link.icon
                  const isActive = link.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(link.href)
                  return (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-2 ${isActive ? 'font-medium' : ''}`}
                      >
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
