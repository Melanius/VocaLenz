import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '단어 퀴즈',
}

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children
}
