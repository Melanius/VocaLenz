import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/event-logger'
import { kstDateToUTCStart, kstDateToUTCEnd } from '@/lib/date-utils'

const MAX_COMBINED_SIZE = 5000

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') // 'page' | null (null = legacy)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 9999)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const status = searchParams.get('status') || 'all'
    const dateFrom = searchParams.get('dateFrom') || null
    const dateTo = searchParams.get('dateTo') || null
    const memo = searchParams.get('memo') || null

    if (mode === 'page') {
      // Paginated mode: apply filters + pagination, return {items, total, totalAll, hasMore}
      let q = supabaseAdmin
        .from('user_vocabulary')
        .select('*, word:words(*)', { count: 'exact' })
        .eq('user_id', user.id)

      if (status === 'memorized') q = q.eq('is_memorized', true)
      else if (status === 'not-memorized') q = q.eq('is_memorized', false)
      else if (status === 'needs-review') q = q.eq('needs_review', true)
      if (dateFrom) q = q.gte('added_at', kstDateToUTCStart(dateFrom))
      if (dateTo) q = q.lte('added_at', kstDateToUTCEnd(dateTo))
      if (memo) q = q.ilike('memo', `%${memo}%`)

      const [pagedResult, countResult] = await Promise.all([
        q.order('added_at', { ascending: false }).range(offset, offset + limit - 1),
        supabaseAdmin
          .from('user_vocabulary')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      if (pagedResult.error || countResult.error) {
        return NextResponse.json({ error: '단어장 조회에 실패했습니다.' }, { status: 500 })
      }

      const total = pagedResult.count ?? 0
      return NextResponse.json({
        items: pagedResult.data || [],
        total,
        totalAll: countResult.count ?? 0,
        hasMore: total > offset + limit,
      })
    }

    // Legacy mode (no mode param): return all items
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

    const { wordId, sessionId } = await request.json()

    if (!wordId) {
      return NextResponse.json({ error: '단어 ID가 필요합니다.' }, { status: 400 })
    }

    // 합산 개수 제한 체크
    const [{ count: vocabCount }, { count: exprCount }] = await Promise.all([
      supabaseAdmin.from('user_vocabulary').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabaseAdmin.from('user_expressions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    const combined = (vocabCount || 0) + (exprCount || 0)

    if (combined >= MAX_COMBINED_SIZE) {
      return NextResponse.json(
        { error: `단어장이 가득 찼습니다. (합산 최대 ${MAX_COMBINED_SIZE}개)` },
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

    if (sessionId) {
      // word 정보를 가져와서 로깅
      const wordData = data?.word as { word?: string } | undefined
      logEvent({
        sessionId,
        userId: user.id,
        page: '/vocabulary',
        action: 'vocab_add',
        metadata: { word_id: wordId, word: wordData?.word },
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

    const { vocabularyId, sessionId } = await request.json()

    if (!vocabularyId) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    // 삭제 전 word_id 조회 (로깅용)
    const { data: vocabData } = await supabaseAdmin
      .from('user_vocabulary')
      .select('word_id')
      .eq('id', vocabularyId)
      .eq('user_id', user.id)
      .single()

    const { error } = await supabaseAdmin
      .from('user_vocabulary')
      .delete()
      .eq('id', vocabularyId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
    }

    if (sessionId) {
      logEvent({
        sessionId,
        userId: user.id,
        page: '/vocabulary',
        action: 'vocab_remove',
        metadata: { word_id: vocabData?.word_id },
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

    const { vocabularyId, is_memorized, needs_review, memo, sessionId } = await request.json()

    if (!vocabularyId) {
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
      .from('user_vocabulary')
      .update(updateData)
      .eq('id', vocabularyId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
    }

    if (sessionId) {
      if (typeof is_memorized === 'boolean') {
        logEvent({
          sessionId,
          userId: user.id,
          page: '/vocabulary',
          action: 'vocab_memorize',
          metadata: { word_id: vocabularyId, is_memorized },
        })
      }
      if (typeof needs_review === 'boolean') {
        logEvent({
          sessionId,
          userId: user.id,
          page: '/vocabulary',
          action: 'vocab_review',
          metadata: { word_id: vocabularyId, needs_review },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
