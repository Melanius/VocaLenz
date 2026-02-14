import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { display_preferences } = await request.json()

    if (!display_preferences) {
      return NextResponse.json({ error: '설정 데이터가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ display_preferences })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: '설정 저장에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
