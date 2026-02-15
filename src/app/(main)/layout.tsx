'use client'

import { SearchProvider } from '@/contexts/search-context'
import { Sidebar } from '@/components/layout/sidebar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SearchProvider>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* 데스크톱 사이드바 */}
        <aside className="hidden md:flex w-64 flex-shrink-0">
          <Sidebar />
        </aside>

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </SearchProvider>
  )
}
