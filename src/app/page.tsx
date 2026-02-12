'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setSearchHistory([...searchHistory, searchQuery])
      // TODO: Phase 2에서 실제 검색 기능 구현
      setSearchQuery('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 pt-32">
        {/* Brand Title */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-3">
            VocaLenz
          </h1>
          <p className="text-muted-foreground text-sm">
            AI 기반 영어 단어 학습
          </p>
        </div>

        {/* Search Container */}
        <div className="w-full max-w-3xl">
          {/* Search History - Chat Style */}
          {searchHistory.length > 0 && (
            <div className="mb-8 space-y-4">
              {searchHistory.map((query, index) => (
                <div
                  key={index}
                  className="bg-card rounded-2xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Search className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">검색어</p>
                      <p className="text-base font-medium text-foreground">{query}</p>
                      <div className="mt-3 text-sm text-muted-foreground">
                        검색 결과가 여기에 표시됩니다 (Phase 2에서 구현 예정)
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="영어 단어를 검색하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-5 pr-14 text-base rounded-full border-2 border-input focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all shadow-sm"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 h-10 w-10 rounded-full"
                disabled={!searchQuery.trim()}
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Suggestions (Empty State) */}
          {searchHistory.length === 0 && (
            <div className="mt-8 text-center space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {['TEPS 단어', 'TOEIC 단어', '퀴즈 풀기', 'AI 학습', '내 단어장', '학습 통계'].map((suggestion) => (
                  <button
                    key={suggestion}
                    className="px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-sm font-medium text-foreground"
                    onClick={() => setSearchQuery(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                GPT-4o-mini 기반 AI Gatekeeper가 자연어 질문을 분석하여 정확한 단어를 추천합니다
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Next.js 15.5.12</span>
          <span>•</span>
          <span>React 19</span>
          <span>•</span>
          <span>Supabase</span>
          <span>•</span>
          <span>OpenAI</span>
        </div>
      </footer>
    </div>
  )
}
