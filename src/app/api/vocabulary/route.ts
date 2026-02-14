import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const MAX_VOCABULARY_SIZE = 100

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_vocabulary')
      .select('*, word:words(*)')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: '단어장 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { wordId } = await request.json()

    if (!wordId) {
      return NextResponse.json({ error: '단어 ID가 필요합니다.' }, { status: 400 })
    }

    // 개수 제한 체크
    const { count } = await supabaseAdmin
      .from('user_vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count !== null && count >= MAX_VOCABULARY_SIZE) {
      return NextResponse.json(
        { error: '단어장이 가득 찼습니다. (최대 100개)' },
        { status: 400 }
      )
    }

    // 중복 체크
    const { data: existing } = await supabaseAdmin
      .from('user_vocabulary')
      .select('id')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .single()

    if (existing) {
      return NextResponse.json({ error: '이미 단어장에 있는 단어입니다.' }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_vocabulary')
      .insert({ user_id: user.id, word_id: wordId })
      .select('*, word:words(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: '추가에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { vocabularyId } = await request.json()

    if (!vocabularyId) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('user_vocabulary')
      .delete()
      .eq('id', vocabularyId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { vocabularyId, is_memorized } = await request.json()

    if (!vocabularyId || typeof is_memorized !== 'boolean') {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('user_vocabulary')
      .update({ is_memorized })
      .eq('id', vocabularyId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
