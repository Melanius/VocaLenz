import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

// 단어 검색 + 목록 조회
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  let dbQuery = supabaseAdmin
    .from('words')
    .select('*', { count: 'exact' })

  if (query) {
    dbQuery = dbQuery.ilike('word', `%${query}%`)
  }

  const { data, error, count } = await dbQuery
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: '단어 목록 조회 실패' }, { status: 500 })
  }

  return NextResponse.json({
    words: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  })
}

// 단어 수정
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: '단어 ID가 필요합니다.' }, { status: 400 })
  }

  // 수정 가능 필드 제한
  const allowedFields = [
    'word', 'part_of_speech', 'pronunciation', 'meanings',
    'image_text', 'description', 'description_en', 'teps_point',
    'synonyms', 'antonyms', 'comparisons', 'paraphrasing',
    'example_sentence', 'example_translation', 'difficulty_level',
  ]

  const safeUpdates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in updates) {
      safeUpdates[field] = updates[field]
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: '수정할 필드가 없습니다.' }, { status: 400 })
  }

  safeUpdates.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('words')
    .update(safeUpdates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: '단어 수정 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// 단어 삭제
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '단어 ID가 필요합니다.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('words')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: '단어 삭제 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
