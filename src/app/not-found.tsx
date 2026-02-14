import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="mt-4 text-xl font-semibold">페이지를 찾을 수 없습니다</h2>
      <p className="mt-2 text-muted-foreground">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
