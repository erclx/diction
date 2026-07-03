import { Monitor, Moon, Sun } from 'lucide-react'
import type { ComponentType } from 'react'

import { Button } from '@/components/ui/button'

import type { Theme } from './use-theme'
import { useTheme } from './use-theme'

const THEME_ICON: Record<Theme, ComponentType> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const THEME_LABEL: Record<Theme, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  system: 'System theme',
}

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme()
  const Icon = THEME_ICON[theme]

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={`${THEME_LABEL[theme]}, switch theme`}
    >
      <Icon />
    </Button>
  )
}
