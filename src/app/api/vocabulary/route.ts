import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/event-logger'

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

    const { wordId, sessionId } = await request.json()

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

    const { vocabularyId, is_memorized, needs_review, sessionId } = await request.json()

    if (!vocabularyId) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const updateData: Record<string, boolean> = {}
    if (typeof is_memorized === 'boolean') updateData.is_memorized = is_memorized
    if (typeof needs_review === 'boolean') updateData.needs_review = needs_review

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
