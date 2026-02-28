import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get('wordId')
    const type = searchParams.get('type') || 'word'

    if (!wordId) {
      return NextResponse.json({ error: 'wordId가 필요합니다.' }, { status: 400 })
    }

    let error
    if (type === 'expression') {
      ;({ error } = await supabaseAdmin
        .from('user_expressions')
        .update({ needs_review: true })
        .eq('user_id', user.id)
        .eq('expression_id', wordId))
    } else {
      ;({ error } = await supabaseAdmin
        .from('user_vocabulary')
        .update({ needs_review: true })
        .eq('user_id', user.id)
        .eq('word_id', wordId))
    }

    if (error) {
      return NextResponse.json({ error: '복습 표시에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
