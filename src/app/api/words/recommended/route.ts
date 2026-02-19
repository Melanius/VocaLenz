import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    // 오늘 날짜 기준
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // search_logs에서 오늘 가장 많이 검색된 단어 조회
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('search_logs')
      .select('word')
      .in('gatekeeper_status', ['WORD', 'PHRASE'])
      .gte('searched_at', today.toISOString())

    if (logsError) {
      console.error('Failed to fetch search logs:', logsError)
    }

    // 검색어 빈도수 계산
    const wordCounts: Record<string, number> = {}
    if (logs) {
      for (const log of logs) {
        wordCounts[log.word] = (wordCounts[log.word] || 0) + 1
      }
    }

    // 빈도수 기준 정렬 후 상위 4개
    let topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([word]) => word)

    // 오늘 검색 데이터가 부족하면 전체 인기 단어에서 보충
    if (topWords.length < 3) {
      const { data: popularWords } = await supabaseAdmin
        .from('words')
        .select('word')
        .eq('exam_type', 'TEPS')
        .order('search_count', { ascending: false })
        .limit(4)

      if (popularWords) {
        const existing = new Set(topWords)
        for (const w of popularWords) {
          if (!existing.has(w.word) && topWords.length < 4) {
            topWords.push(w.word)
          }
        }
      }
    }

    return NextResponse.json({ words: topWords })
  } catch (error) {
    console.error('Recommended words error:', error)
    return NextResponse.json({ words: [] })
  }
}
