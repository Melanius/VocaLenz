import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '내 단어장',
}

export default function VocabularyLayout({ children }: { children: React.ReactNode }) {
  return children
}
