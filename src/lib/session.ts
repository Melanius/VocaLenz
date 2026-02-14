'use client'

const SESSION_KEY = 'vocalenz_session_id'

// UUID v4 생성 (crypto API 사용)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 세션 ID 가져오기 (없으면 생성)
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return generateUUID()
  }

  let sessionId = localStorage.getItem(SESSION_KEY)

  if (!sessionId) {
    sessionId = generateUUID()
    localStorage.setItem(SESSION_KEY, sessionId)
  }

  return sessionId
}

// 세션 ID 초기화 (로그아웃 시 등)
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}
