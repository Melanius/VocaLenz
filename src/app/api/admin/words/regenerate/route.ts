import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { regenerateWordWithHint } from '@/lib/word-generator'
import { regenerateExpressionWithHint } from '@/lib/expression-generator'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { id, type, hint } = await request.json()

    if (!id || !type || !hint?.trim()) {
      return NextResponse.json({ error: 'id, type, hint이 필요합니다.' }, { status: 400 })
    }

    if (type !== 'word' && type !== 'expression') {
      return NextResponse.json({ error: '유효하지 않은 type입니다.' }, { status: 400 })
    }

    if (type === 'word') {
      const { data: word, error: fetchError } = await supabaseAdmin
        .from('words')
        .select('word, meanings')
        .eq('id', id)
        .single()

      if (fetchError || !word) {
        return NextResponse.json({ error: '단어를 찾을 수 없습니다.' }, { status: 404 })
      }

      const newData = await regenerateWordWithHint(word.word, word.meanings || [], hint.trim())

      const updatePayload = {
        part_of_speech: newData.part_of_speech || null,
        pronunciation: newData.pronunciation || null,
        meanings: newData.meanings || [],
        image_text: newData.image_text || null,
        description: newData.description || null,
        description_en: newData.description_en || null,
        teps_point: newData.teps_point || null,
        synonyms: newData.synonyms || [],
        antonyms: newData.antonyms || [],
        comparisons: newData.comparisons || [],
        paraphrasing: newData.paraphrasing || [],
        example_sentence: newData.example_sentence || null,
        example_translation: newData.example_translation || null,
        difficulty_level: newData.difficulty_level || 2,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabaseAdmin
        .from('words')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'DB 업데이트에 실패했습니다.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, ...updatePayload, word: word.word })
    }

    // expression
    const { data: expr, error: fetchError } = await supabaseAdmin
      .from('expressions')
      .select('expression, meanings')
      .eq('id', id)
      .single()

    if (fetchError || !expr) {
      return NextResponse.json({ error: '표현을 찾을 수 없습니다.' }, { status: 404 })
    }

    const newData = await regenerateExpressionWithHint(expr.expression, expr.meanings || [], hint.trim())

    const updatePayload = {
      image_text: newData.image_text || null,
      meanings: newData.meanings || [],
      description: newData.description || null,
      teps_point: newData.teps_point || null,
      context: newData.context || null,
      pronunciation_tip: newData.pronunciation_tip || null,
      listening_parts: newData.listening_parts || [],
      paraphrasing: newData.paraphrasing || [],
      comparisons: newData.comparisons || [],
      example_sentence: newData.example_sentence || null,
      example_translation: newData.example_translation || null,
      difficulty_level: newData.difficulty_level || 2,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabaseAdmin
      .from('expressions')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'DB 업데이트에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, ...updatePayload, expression: expr.expression })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
