import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VocaLenz - AI 영어 단어장',
  description: 'TEPS/TOEIC 시험 대비를 위한 AI 기반 영어 단어 학습 플랫폼',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
