import { Moon, Sun } from '@phosphor-icons/react'
import { Button } from './ui/button'
import type { ThemeModeControls } from '@/hooks/useThemeMode'

type ThemeToggleProps = Pick<ThemeModeControls, 'mode' | 'toggleMode'>

export function ThemeToggle({ mode, toggleMode }: ThemeToggleProps) {

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleMode}
      className="rounded-full"
    >
      {mode === 'dark' ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
    </Button>
  )
}

