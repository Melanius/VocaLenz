import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_LEVELS = [1, 2, 3, 4]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { wordId, expressionId, currentLevel, requestedLevel } = await request.json()

    if (!VALID_LEVELS.includes(requestedLevel)) {
      return NextResponse.json({ error: '유효하지 않은 레벨입니다.' }, { status: 400 })
    }

    if (currentLevel === requestedLevel) {
      return NextResponse.json({ error: '현재 레벨과 동일합니다.' }, { status: 400 })
    }

    if (!wordId && !expressionId) {
      return NextResponse.json({ error: '단어 또는 표현 ID가 필요합니다.' }, { status: 400 })
    }

    // 중복 pending 요청 확인
    const dupQuery = wordId
      ? supabaseAdmin
          .from('level_change_requests')
          .select('id')
          .eq('user_id', user.id)
          .eq('word_id', wordId)
          .eq('status', 'pending')
          .maybeSingle()
      : supabaseAdmin
          .from('level_change_requests')
          .select('id')
          .eq('user_id', user.id)
          .eq('expression_id', expressionId)
          .eq('status', 'pending')
          .maybeSingle()

    const { data: existing } = await dupQuery
    if (existing) {
      return NextResponse.json(
        { error: '이미 검토 중인 레벨 변경 제안이 있습니다.', code: 'DUPLICATE' },
        { status: 409 }
      )
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      current_level: currentLevel,
      requested_level: requestedLevel,
      status: 'pending',
    }
    if (wordId) insertData.word_id = wordId
    else insertData.expression_id = expressionId

    const { data, error } = await supabaseAdmin
      .from('level_change_requests')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '제안 등록에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
