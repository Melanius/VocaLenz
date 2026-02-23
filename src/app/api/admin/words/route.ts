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

// 단어 일괄 업로드 (CSV 파싱 후 전달)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const { words: rows, onDuplicate = 'skip' } = body as {
    words: Record<string, unknown>[]
    onDuplicate: 'skip' | 'update'
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: '업로드할 단어 데이터가 없습니다.' }, { status: 400 })
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: '한 번에 최대 500개까지 업로드할 수 있습니다.' }, { status: 400 })
  }

  const toArray = (val: unknown): string[] => {
    if (!val || String(val).trim() === '') return []
    return String(val).split(';').map((s) => s.trim()).filter(Boolean)
  }

  const now = new Date().toISOString()
  let inserted = 0
  let updated = 0
  let skipped = 0
  const errors: { word: string; reason: string }[] = []

  for (const row of rows) {
    const wordStr = String(row.word || '').trim().toLowerCase()
    if (!wordStr) { errors.push({ word: '(empty)', reason: '단어 필드 누락' }); continue }

    const meanings = toArray(row.meanings)
    if (meanings.length === 0) { errors.push({ word: wordStr, reason: 'meanings 필드 누락' }); continue }

    const record = {
      word: wordStr,
      exam_type: String(row.exam_type || 'TEPS'),
      part_of_speech: String(row.part_of_speech || '').trim() || null,
      pronunciation: String(row.pronunciation || '').trim() || null,
      meanings,
      image_text: String(row.image_text || '').trim() || null,
      description: String(row.description || '').trim() || null,
      description_en: String(row.description_en || '').trim() || null,
      teps_point: String(row.teps_point || '').trim() || null,
      synonyms: toArray(row.synonyms),
      antonyms: toArray(row.antonyms),
      comparisons: toArray(row.comparisons),
      paraphrasing: toArray(row.paraphrasing),
      example_sentence: String(row.example_sentence || '').trim() || null,
      example_translation: String(row.example_translation || '').trim() || null,
      difficulty_level: Math.min(4, Math.max(1, parseInt(String(row.difficulty_level || '2')) || 2)),
      search_count: 0,
      updated_at: now,
    }

    // 중복 체크
    const { data: existing } = await supabaseAdmin
      .from('words')
      .select('id')
      .eq('word', wordStr)
      .eq('exam_type', record.exam_type)
      .maybeSingle()

    if (existing) {
      if (onDuplicate === 'update') {
        const { error } = await supabaseAdmin
          .from('words')
          .update({ ...record, updated_at: now })
          .eq('id', existing.id)
        if (error) { errors.push({ word: wordStr, reason: error.message }); continue }
        updated++
      } else {
        skipped++
      }
    } else {
      const { error } = await supabaseAdmin
        .from('words')
        .insert({ ...record, created_at: now })
      if (error) { errors.push({ word: wordStr, reason: error.message }); continue }
      inserted++
    }
  }

  return NextResponse.json({ inserted, updated, skipped, errors })
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
