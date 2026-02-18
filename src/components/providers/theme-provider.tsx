'use client'

import * as React from 'react'
import type { SeasonTheme } from '@/types/database'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  season: SeasonTheme
  setSeason: (season: SeasonTheme) => void
}

const SEASON_STORAGE_KEY = 'vocalenz-season'

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(
  undefined
)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vocalenz-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme)
  const [season, setSeason] = React.useState<SeasonTheme>('winter')
  const [mounted, setMounted] = React.useState(false)

  // 마운트 후 localStorage에서 테마 + 계절 읽기
  React.useEffect(() => {
    setMounted(true)
    const storedTheme = localStorage.getItem(storageKey) as Theme | null
    if (storedTheme) {
      setTheme(storedTheme)
    }
    const storedSeason = localStorage.getItem(SEASON_STORAGE_KEY) as SeasonTheme | null
    if (storedSeason) {
      setSeason(storedSeason)
    }
  }, [storageKey])

  // 다크/라이트 모드 적용
  React.useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme, mounted])

  // 계절 테마 적용
  React.useEffect(() => {
    if (!mounted) return
    const root = window.document.documentElement
    root.setAttribute('data-season', season)
  }, [season, mounted])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
    season,
    setSeason: (newSeason: SeasonTheme) => {
      localStorage.setItem(SEASON_STORAGE_KEY, newSeason)
      setSeason(newSeason)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
