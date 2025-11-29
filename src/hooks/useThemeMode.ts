import { useCallback, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

export interface ThemeModeControls {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const STORAGE_KEY = 'trucycle-theme-mode'

const getSystemPreference = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const readStoredPreference = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

export function useThemeMode(): ThemeModeControls {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredPreference() ?? getSystemPreference())
  const hasExplicitPreference = useMemo(() => readStoredPreference() !== null, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.toggle('dark', mode === 'dark')
    root.dataset.theme = mode
    root.style.colorScheme = mode
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  useEffect(() => {
    if (hasExplicitPreference) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncSystemPreference = (event: MediaQueryListEvent) => {
      setMode(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', syncSystemPreference)
    return () => media.removeEventListener('change', syncSystemPreference)
  }, [hasExplicitPreference])

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { mode, setMode, toggleMode }
}

