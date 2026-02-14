'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { SearchProvider } from '@/contexts/search-context'
import { Sidebar } from '@/components/layout/sidebar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SearchProvider>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* 데스크톱 사이드바 */}
        <aside className="hidden md:flex w-64 flex-shrink-0">
          <Sidebar />
        </aside>

        {/* 모바일 사이드바 (Sheet) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-3 top-16 z-40 md:hidden h-8 w-8"
              aria-label="검색 기록 열기"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar open={true} onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </SearchProvider>
  )
}
