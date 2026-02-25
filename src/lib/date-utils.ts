const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** UTC ISO string → KST 기준 'YYYY-MM-DD' */
export function toKSTDateString(utcStr: string): string {
  const kstMs = new Date(utcStr).getTime() + KST_OFFSET_MS
  return new Date(kstMs).toISOString().slice(0, 10)
}

/** KST 'YYYY-MM-DD' → KST 자정을 UTC ISO로 변환 (쿼리 시작값) */
export function kstDateToUTCStart(kstDate: string): string {
  return new Date(`${kstDate}T00:00:00+09:00`).toISOString()
}

/** KST 'YYYY-MM-DD' → KST 23:59:59.999를 UTC ISO로 변환 (쿼리 종료값) */
export function kstDateToUTCEnd(kstDate: string): string {
  return new Date(`${kstDate}T23:59:59.999+09:00`).toISOString()
}

/** KST 기준 오늘 날짜 'YYYY-MM-DD' */
export function getKSTToday(): string {
  return toKSTDateString(new Date().toISOString())
}

export function formatAddedDate(dateStr: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000
  )
  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
