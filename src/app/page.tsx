import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-5xl font-bold tracking-tight">
          VocaLenz
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          AI 기반 영어 단어 학습 플랫폼
          <br />
          TEPS/TOEIC 시험 대비를 위한 스마트한 학습 솔루션
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Button size="lg" asChild>
            <Link href="/search">단어 검색하기</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/quiz">퀴즈 풀기</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-6 mt-16">
        <Card className="p-6 space-y-3">
          <h3 className="text-xl font-semibold">AI Gatekeeper</h3>
          <p className="text-muted-foreground">
            GPT-4o-mini를 활용한 자연어 질문 분석으로 정확한 단어 추천
          </p>
        </Card>
        <Card className="p-6 space-y-3">
          <h3 className="text-xl font-semibold">스마트 퀴즈</h3>
          <p className="text-muted-foreground">
            개인화된 난이도 조정과 AI 기반 문제 생성으로 효과적인 학습
          </p>
        </Card>
        <Card className="p-6 space-y-3">
          <h3 className="text-xl font-semibold">AI 학습 채팅</h3>
          <p className="text-muted-foreground">
            대화형 학습으로 맥락 속에서 단어 이해하기
          </p>
        </Card>
      </section>

      {/* Stats Section */}
      <section className="mt-16 text-center">
        <div className="inline-flex gap-8 text-sm text-muted-foreground">
          <span>Next.js 15.5.12</span>
          <span>•</span>
          <span>React 19</span>
          <span>•</span>
          <span>TypeScript</span>
          <span>•</span>
          <span>Supabase</span>
          <span>•</span>
          <span>OpenAI</span>
        </div>
      </section>
    </div>
  )
}
