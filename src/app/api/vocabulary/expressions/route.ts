import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/event-logger'

const MAX_EXPRESSION_SIZE = 2000

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_expressions')
      .select('*, expression:expressions(*)')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: '표현 단어장 조회에 실패했습니다.' }, { status: 500 })
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

    const { expressionId, sessionId } = await request.json()

    if (!expressionId) {
      return NextResponse.json({ error: '표현 ID가 필요합니다.' }, { status: 400 })
    }

    const { count } = await supabaseAdmin
      .from('user_expressions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count !== null && count >= MAX_EXPRESSION_SIZE) {
      return NextResponse.json(
        { error: '표현 단어장이 가득 찼습니다. (최대 2000개)' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabaseAdmin
      .from('user_expressions')
      .select('id')
      .eq('user_id', user.id)
      .eq('expression_id', expressionId)
      .single()

    if (existing) {
      return NextResponse.json({ error: '이미 단어장에 있는 표현입니다.' }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_expressions')
      .insert({ user_id: user.id, expression_id: expressionId })
      .select('*, expression:expressions(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: '추가에 실패했습니다.' }, { status: 500 })
    }

    if (sessionId) {
      const exprData = data?.expression as { expression?: string } | undefined
      logEvent({
        sessionId,
        userId: user.id,
        page: '/vocabulary',
        action: 'expr_vocab_add',
        metadata: { expression_id: expressionId, expression: exprData?.expression },
      })
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

    const { userExpressionId, sessionId } = await request.json()

    if (!userExpressionId) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('user_expressions')
      .delete()
      .eq('id', userExpressionId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
    }

    if (sessionId) {
      logEvent({
        sessionId,
        userId: user.id,
        page: '/vocabulary',
        action: 'expr_vocab_remove',
        metadata: { user_expression_id: userExpressionId },
      })
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

    const { userExpressionId, is_memorized, needs_review, memo } = await request.json()

    if (!userExpressionId) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const updateData: Record<string, boolean | string> = {}
    if (typeof is_memorized === 'boolean') updateData.is_memorized = is_memorized
    if (typeof needs_review === 'boolean') updateData.needs_review = needs_review
    if (typeof memo === 'string') updateData.memo = memo

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('user_expressions')
      .update(updateData)
      .eq('id', userExpressionId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
