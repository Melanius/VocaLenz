'use client'

import { useEffect, useRef } from 'react'

/**
 * 안드로이드/브라우저 뒤로가기 버튼을 가로채서
 * 페이지를 떠나는 대신 다이얼로그/시트를 닫습니다.
 *
 * URL hash(#dialog)를 추가해 실제 URL 변화를 만들기 때문에
 * Samsung Android 등 모든 모바일 브라우저에서 안정적으로 동작합니다.
 *
 * @param isOpen  - 다이얼로그/시트 열림 여부
 * @param onClose - 뒤로가기 버튼 눌렸을 때 호출할 닫기 함수
 */
export function useDialogBackButton(isOpen: boolean, onClose: () => void) {
  const pushedRef = useRef(false)
  const closedViaBackRef = useRef(false)
  const onCloseRef = useRef(onClose)

  // onClose 최신 참조 유지
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // 다이얼로그 열림/닫힘에 따라 history 관리
  useEffect(() => {
    if (!isOpen) return
    if (typeof window === 'undefined') return

    // URL hash를 추가해 실제 history entry 생성
    // → URL 변화가 없으면 일부 Android에서 back 인터셉트가 무시됨
    const base = window.location.pathname + window.location.search
    window.history.pushState({ vocalenzDialog: true }, '', base + '#dialog')
    pushedRef.current = true

    return () => {
      if (!pushedRef.current) return
      pushedRef.current = false
      if (!closedViaBackRef.current) {
        // X버튼·배경 클릭으로 닫힌 경우 → 쌓인 #dialog entry 제거
        window.history.back()
      }
      closedViaBackRef.current = false
    }
  }, [isOpen])

  // popstate 감지 — capture 페이즈 → Next.js 핸들러보다 먼저 실행
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = (e: PopStateEvent) => {
      if (!pushedRef.current) return
      // Next.js App Router가 같은 popstate를 처리하지 못하도록 차단
      e.stopImmediatePropagation()
      closedViaBackRef.current = true
      pushedRef.current = false
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState, { capture: true })
    return () => window.removeEventListener('popstate', handlePopState, { capture: true })
  }, [])
}
