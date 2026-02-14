'use client'

import { MessageSquare, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSearchContext } from '@/contexts/search-context'

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { history, clearHistory } = useSearchContext()

  // 세션별로 그룹핑 (현재는 단일 세션)
  const wordSearches = history.filter((item) => item.result.type === 'word')

  return (
    <div
      className={`
        flex flex-col h-full bg-card border-r
        ${open !== undefined ? (open ? 'translate-x-0' : '-translate-x-full') : ''}
        transition-transform duration-200
      `}
    >
      {/* 사이드바 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">검색 기록</h2>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearHistory}
              aria-label="기록 삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:hidden"
              onClick={onClose}
              aria-label="사이드바 닫기"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 검색 기록 목록 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              검색 기록이 없습니다
            </p>
          ) : (
            history
              .slice()
              .reverse()
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors cursor-default"
                >
                  <StatusDot type={item.result.type} />
                  <span className="truncate text-foreground">{item.query}</span>
                </div>
              ))
          )}
        </div>
      </ScrollArea>

      {/* 통계 */}
      {wordSearches.length > 0 && (
        <div className="p-3 border-t">
          <p className="text-xs text-muted-foreground text-center">
            학습한 단어: {wordSearches.length}개
          </p>
        </div>
      )}
    </div>
  )
}

function StatusDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    word: 'bg-green-500',
    typo: 'bg-yellow-500',
    korean: 'bg-purple-500',
    invalid: 'bg-red-500',
    low_value: 'bg-gray-400',
    loading: 'bg-blue-400 animate-pulse',
    error: 'bg-red-400',
  }

  return (
    <span
      className={`flex-shrink-0 h-2 w-2 rounded-full ${colors[type] || 'bg-gray-400'}`}
    />
  )
}
