import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_scores')
      .select('*')
      .eq('user_id', user.id)
      .order('exam_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '성적 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { round, listening, vocabulary, grammar, reading, total, exam_date } = body

    const { data, error } = await supabaseAdmin
      .from('user_scores')
      .insert({
        user_id: user.id,
        round,
        listening: listening || null,
        vocabulary: vocabulary || null,
        grammar: grammar || null,
        reading: reading || null,
        total: total || null,
        exam_date: exam_date || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '성적 입력에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { scoreId, ...fields } = body

    if (!scoreId) {
      return NextResponse.json({ error: '성적 ID가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('user_scores')
      .update(fields)
      .eq('id', scoreId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { scoreId } = await request.json()

    if (!scoreId) {
      return NextResponse.json({ error: '성적 ID가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('user_scores')
      .delete()
      .eq('id', scoreId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
