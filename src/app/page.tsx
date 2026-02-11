export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">
          VocaLenz
        </h1>
        <p className="text-center text-lg">
          AI 영어 단어장 - TEPS/TOEIC 시험 대비
        </p>
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Next.js 15.5.12 | React 19 | TypeScript | Tailwind CSS</p>
        </div>
      </div>
    </main>
  )
}
