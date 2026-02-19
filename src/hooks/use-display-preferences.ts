'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/components/providers/auth-provider'
import type { DisplayPreferences, WordCardField, ExpressionCardField } from '@/types/database'

const STORAGE_KEY = 'vocalenz_display_preferences'
const STORAGE_VERSION_KEY = 'vocalenz_prefs_version'
const CURRENT_PREFS_VERSION = 2  // bump to force fieldOrder reset
const SYNC_EVENT = 'vocalenz_preferences_sync'

const DEFAULT_EXPR_VISIBLE_FIELDS: ExpressionCardField[] = [
  'image_text',
  'meanings',
  'description',
  'context',
  'pronunciation_tip',
  'teps_point',
  'listening_parts',
  'paraphrasing',
  'comparisons',
  'example',
]

const DEFAULT_EXPR_FIELD_ORDER: ExpressionCardField[] = [
  'image_text',
  'meanings',
  'description',
  'context',
  'pronunciation_tip',
  'teps_point',
  'listening_parts',
  'paraphrasing',
  'comparisons',
  'example',
]

const DEFAULT_PREFERENCES: DisplayPreferences = {
  visibleFields: [
    'image_text',
    'meanings',
    'description',
    'teps_point',
    'example',
    'paraphrasing',
    'comparisons',
  ],
  fieldOrder: [
    'image_text',
    'meanings',
    'description',
    'teps_point',
    'example',
    'paraphrasing',
    'comparisons',
    'description_en',
    'synonyms',
    'antonyms',
  ],
  searchMode: 1,
  autoSaveToVocabulary: true,
  exprVisibleFields: DEFAULT_EXPR_VISIBLE_FIELDS,
  exprFieldOrder: DEFAULT_EXPR_FIELD_ORDER,
}

// 이전 저장 데이터 마이그레이션
function migratePreferences(prefs: DisplayPreferences): DisplayPreferences {
  const migrated = { ...prefs }
  // meanings 필드가 fieldOrder에 없으면 추가
  if (!migrated.fieldOrder.includes('meanings')) {
    migrated.visibleFields = [...migrated.visibleFields, 'meanings']
  }
  // 버전 체크: fieldOrder를 최신 기본순으로 리셋 (사용자 visibleFields는 유지)
  if (typeof window !== 'undefined') {
    const savedVersion = parseInt(localStorage.getItem(STORAGE_VERSION_KEY) || '0')
    if (savedVersion < CURRENT_PREFS_VERSION) {
      migrated.fieldOrder = [...DEFAULT_PREFERENCES.fieldOrder]
      localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_PREFS_VERSION))
    }
  }
  // 청해 구문 필드가 없으면 기본값으로 초기화
  if (!migrated.exprVisibleFields) {
    migrated.exprVisibleFields = [...DEFAULT_EXPR_VISIBLE_FIELDS]
  }
  if (!migrated.exprFieldOrder) {
    migrated.exprFieldOrder = [...DEFAULT_EXPR_FIELD_ORDER]
  }
  return migrated
}

function readFromStorage(): DisplayPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return migratePreferences(JSON.parse(stored))
  } catch {
    // ignore
  }
  return null
}

function writeToStorage(prefs: DisplayPreferences) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    // 같은 탭 내 다른 hook 인스턴스에 동기화
    window.dispatchEvent(new Event(SYNC_EVENT))
  } catch {
    // ignore
  }
}

export function useDisplayPreferences() {
  const { profile } = useAuthContext()
  const [preferences, setPreferences] = useState<DisplayPreferences>(DEFAULT_PREFERENCES)
  const [loaded, setLoaded] = useState(false)

  // 초기 로드: localStorage 우선 → DB 프로필은 초기 시드로만 사용
  useEffect(() => {
    const stored = readFromStorage()
    if (stored) {
      // localStorage가 있으면 항상 우선
      setPreferences(stored)
    } else if (profile?.display_preferences) {
      // localStorage 없으면 DB 프로필을 초기 시드로 사용 (마이그레이션 적용)
      const migrated = migratePreferences(profile.display_preferences)
      setPreferences(migrated)
      writeToStorage(migrated)
    }
    setLoaded(true)
  }, [profile])

  // 같은 탭 내 다른 컴포넌트에서 preferences 변경 시 동기화
  useEffect(() => {
    const handleSync = () => {
      const stored = readFromStorage()
      if (stored) {
        setPreferences(stored)
      }
    }
    window.addEventListener(SYNC_EVENT, handleSync)
    return () => window.removeEventListener(SYNC_EVENT, handleSync)
  }, [])

  const updatePreferences = useCallback(
    (updates: Partial<DisplayPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...updates }
        writeToStorage(next)
        // 로그인 상태면 DB에도 저장
        if (profile) {
          fetch('/api/users/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_preferences: next }),
          }).catch(() => {
            // DB 저장 실패 시 localStorage만으로 동작
          })
        }
        return next
      })
    },
    [profile]
  )

  const toggleField = useCallback(
    (field: WordCardField) => {
      setPreferences((prev) => {
        const visible = prev.visibleFields.includes(field)
        const visibleFields = visible
          ? prev.visibleFields.filter((f) => f !== field)
          : [...prev.visibleFields, field]

        const next = { ...prev, visibleFields }
        writeToStorage(next)
        return next
      })
    },
    []
  )

  const reorderFields = useCallback(
    (fieldOrder: WordCardField[]) => {
      updatePreferences({ fieldOrder })
    },
    [updatePreferences]
  )

  const setSearchMode = useCallback(
    (searchMode: 1 | 2 | 3 | 4) => {
      updatePreferences({ searchMode })
    },
    [updatePreferences]
  )

  return {
    preferences,
    loaded,
    updatePreferences,
    toggleField,
    reorderFields,
    setSearchMode,
  }
}
