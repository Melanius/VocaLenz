import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/event-logger'

const VALID_LEVELS = [1, 2, 3, 4]

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { wordId, expressionId, newLevel } = await request.json()

    if (!VALID_LEVELS.includes(newLevel)) {
      return NextResponse.json({ error: '유효하지 않은 레벨입니다. (1~4)' }, { status: 400 })
    }

    if (wordId) {
      const { data: word } = await supabaseAdmin
        .from('words')
        .select('word, difficulty_level')
        .eq('id', wordId)
        .single()

      const { error } = await supabaseAdmin
        .from('words')
        .update({ difficulty_level: newLevel })
        .eq('id', wordId)

      if (error) {
        return NextResponse.json({ error: '레벨 수정에 실패했습니다.' }, { status: 500 })
      }

      logEvent({
        userId: user.id,
        page: '/vocabulary',
        action: 'word_level_changed',
        metadata: {
          word_id: wordId,
          word: word?.word,
          old_level: word?.difficulty_level,
          new_level: newLevel,
        },
      })
    } else if (expressionId) {
      const { data: expr } = await supabaseAdmin
        .from('expressions')
        .select('expression, difficulty_level')
        .eq('id', expressionId)
        .single()

      const { error } = await supabaseAdmin
        .from('expressions')
        .update({ difficulty_level: newLevel })
        .eq('id', expressionId)

      if (error) {
        return NextResponse.json({ error: '레벨 수정에 실패했습니다.' }, { status: 500 })
      }

      logEvent({
        userId: user.id,
        page: '/vocabulary',
        action: 'expression_level_changed',
        metadata: {
          expression_id: expressionId,
          expression: expr?.expression,
          old_level: expr?.difficulty_level,
          new_level: newLevel,
        },
      })
    } else {
      return NextResponse.json({ error: '단어 또는 표현 ID가 필요합니다.' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
