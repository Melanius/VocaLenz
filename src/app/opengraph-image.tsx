import { ImageResponse } from 'next/og'

export const alt = 'VocaLenz - AI 영어 단어장'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.2)',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 48, fontWeight: 700, color: 'white' }}>V</span>
        </div>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: 'white',
            margin: 0,
            letterSpacing: -1,
          }}
        >
          VocaLenz
        </h1>
        <p
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.85)',
            margin: '16px 0 0',
          }}
        >
          AI 기반 영어 단어 학습 · TEPS/TOEIC 대비
        </p>
      </div>
    ),
    { ...size }
  )
}
