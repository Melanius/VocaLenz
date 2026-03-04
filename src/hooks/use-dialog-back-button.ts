'use client'

import { useEffect, useRef } from 'react'

/**
 * 안드로이드/브라우저 뒤로가기 버튼을 가로채서
 * 페이지를 떠나는 대신 다이얼로그/시트를 닫습니다.
 *
 * Next.js App Router의 popstate 핸들러보다 먼저 실행되도록
 * capture 페이즈에 리스너를 등록하고 stopImmediatePropagation으로 차단합니다.
 *
 * @param isOpen - 다이얼로그/시트가 열려있는지 여부
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

  // 다이얼로그 열림/닫힘에 따라 history 상태 관리
  useEffect(() => {
    if (!isOpen) return
    if (typeof window === 'undefined') return

    // URL을 명시적으로 지정해 브라우저별 동작 차이 방지
    window.history.pushState({ vocalenzDialog: true }, '', window.location.href)
    pushedRef.current = true

    return () => {
      if (!pushedRef.current) return
      pushedRef.current = false
      if (!closedViaBackRef.current) {
        // X 버튼/배경 클릭으로 닫힌 경우 → 쌓인 history 정리
        window.history.back()
      }
      closedViaBackRef.current = false
    }
  }, [isOpen])

  // popstate 이벤트 (뒤로가기 버튼) 감지
  // capture 페이즈로 등록 → Next.js App Router 핸들러보다 먼저 실행
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = (e: PopStateEvent) => {
      if (!pushedRef.current) return
      // Next.js App Router가 이 popstate를 처리하지 못하도록 차단
      e.stopImmediatePropagation()
      closedViaBackRef.current = true
      pushedRef.current = false
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState, { capture: true })
    return () => window.removeEventListener('popstate', handlePopState, { capture: true })
  }, [])
}
