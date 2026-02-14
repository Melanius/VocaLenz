import { NextRequest, NextResponse } from 'next/server'
import { evaluateWithGatekeeper } from '@/lib/gatekeeper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input } = body

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: '입력값이 필요합니다.' },
        { status: 400 }
      )
    }

    // 입력 정규화
    const normalized = input.trim().slice(0, 100)

    if (!normalized) {
      return NextResponse.json(
        { error: '유효한 입력값이 필요합니다.' },
        { status: 400 }
      )
    }

    const result = await evaluateWithGatekeeper(normalized)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Gatekeeper API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
