import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { updates } = await request.json() as {
      updates: { vocabId: string; newMemo: string; type: 'word' | 'expression' }[]
    }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return new Response(JSON.stringify({ error: '업데이트 목록이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const wordUpdates = updates.filter(u => u.type === 'word')
    const exprUpdates = updates.filter(u => u.type === 'expression')

    const results = await Promise.all([
      ...wordUpdates.map(u =>
        supabaseAdmin
          .from('user_vocabulary')
          .update({ memo: u.newMemo })
          .eq('id', u.vocabId)
          .eq('user_id', user.id)
      ),
      ...exprUpdates.map(u =>
        supabaseAdmin
          .from('user_expressions')
          .update({ memo: u.newMemo })
          .eq('id', u.vocabId)
          .eq('user_id', user.id)
      ),
    ])

    const errorCount = results.filter(r => r.error).length

    return new Response(JSON.stringify({
      updated: updates.length - errorCount,
      errors: errorCount,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
