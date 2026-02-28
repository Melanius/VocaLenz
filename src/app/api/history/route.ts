import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const type = searchParams.get('type') || 'word'

    if (type === 'expression') {
      const { data, error, count } = await supabaseAdmin
        .from('user_expression_history')
        .select('*, expression:expressions(*)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('searched_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return NextResponse.json({ error: '이력 조회에 실패했습니다.' }, { status: 500 })
      }

      return NextResponse.json({
        items: data,
        total: count,
        page,
        limit,
        hasMore: count !== null && offset + limit < count,
      })
    }

    // Default: word history
    const { data, error, count } = await supabaseAdmin
      .from('user_word_history')
      .select('*, word:words(*)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: '이력 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      items: data,
      total: count,
      page,
      limit,
      hasMore: count !== null && offset + limit < count,
    })
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'word'

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 })
    }

    const table = type === 'expression' ? 'user_expression_history' : 'user_word_history'
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
