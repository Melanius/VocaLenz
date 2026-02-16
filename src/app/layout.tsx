import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  metadataBase: new URL('https://vocalenz.vercel.app'),
  title: {
    default: 'VocaLenz - AI 영어 단어장',
    template: '%s | VocaLenz',
  },
  description: 'TEPS 시험 대비를 위한 AI 기반 영어 단어 학습 플랫폼',
  keywords: ['영어 단어', 'TEPS', 'AI 단어장', '영어 학습', '영어 단어장'],
  authors: [{ name: 'VocaLenz' }],
  openGraph: {
    title: 'VocaLenz - AI 영어 단어장',
    description: 'AI가 만들어주는 나만의 영어 단어 학습 카드',
    siteName: 'VocaLenz',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VocaLenz - AI 영어 단어장',
    description: 'AI가 만들어주는 나만의 영어 단어 학습 카드',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider defaultTheme="system" storageKey="vocalenz-theme">
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
