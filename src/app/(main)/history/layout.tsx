import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '검색 이력',
}

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
