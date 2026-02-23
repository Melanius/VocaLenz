'use client'

import { useState, useEffect } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { SearchProvider } from '@/contexts/search-context'
import { VocabularyProvider } from '@/contexts/vocabulary-context'
import { ExpressionVocabularyProvider } from '@/contexts/expression-vocabulary-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'

const SIDEBAR_KEY = 'vocalenz-sidebar-open'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    if (saved !== null) setSidebarOpen(saved === 'true')
    setMounted(true)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }

  return (
    <SearchProvider>
      <VocabularyProvider>
        <ExpressionVocabularyProvider>
          <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
            {/* 데스크톱 사이드바 */}
            <aside
              className={`hidden md:flex flex-shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden ${
                mounted && sidebarOpen ? 'w-64' : 'w-0'
              }`}
            >
              <div className="w-64">
                <Sidebar />
              </div>
            </aside>

            {/* 메인 콘텐츠 영역 */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* 사이드바 토글 버튼 (데스크톱만) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="hidden md:flex absolute top-2 left-2 z-10 h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
              >
                {mounted && sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
              {children}
            </div>
          </div>
        </ExpressionVocabularyProvider>
      </VocabularyProvider>
    </SearchProvider>
  )
}
