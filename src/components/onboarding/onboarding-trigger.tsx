'use client'

import { useAuthContext } from '@/components/providers/auth-provider'
import { OnboardingModal } from './onboarding-modal'

export function OnboardingTrigger() {
  const { user, profile, loading } = useAuthContext()

  // 로딩 중이거나, 비로그인이거나, 온보딩 완료된 경우 표시하지 않음
  if (loading || !user || !profile) return null
  if (profile.onboarding_completed) return null

  return <OnboardingModal />
}
