import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const alt = 'VocaLenz - AI 영어 단어장'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  const logoData = readFileSync(join(process.cwd(), 'public', 'logo', 'VocaLenz_logo_light.png'))
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={800}
          height={253}
          alt="VocaLenz"
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size }
  )
}
