'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '16px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
            심각한 오류가 발생했습니다
          </h2>
          <p style={{ fontSize: '14px', color: '#666', maxWidth: '400px' }}>
            페이지를 새로고침하거나, 문제가 지속되면 잠시 후 다시 방문해 주세요.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
