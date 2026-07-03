import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { PassageScoring } from '@/features/passage-scoring/passage-scoring'
import { SessionHistory } from '@/features/session-history/session-history'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { cn } from '@/lib/utils'

import type { HealthState } from './use-backend-health'
import { useBackendHealth } from './use-backend-health'

const STATUS_DOT: Record<HealthState, string> = {
  checking: 'bg-muted-foreground',
  ok: 'bg-success',
  error: 'bg-destructive',
}

type View = 'practice' | 'history'

interface BackendStatusProps {
  health: HealthState
}

function BackendStatus({ health }: BackendStatusProps) {
  return (
    <div
      className="flex items-center gap-2 text-xs text-muted-foreground"
      data-testid="backend-status"
      title={`Backend: ${health}`}
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[health])}
      />
      <span className="hidden font-mono sm:inline">Backend: {health}</span>
    </div>
  )
}

interface ViewNavProps {
  view: View
  onChange: (view: View) => void
}

const VIEWS: readonly { value: View; label: string }[] = [
  { value: 'practice', label: 'Practice' },
  { value: 'history', label: 'History' },
]

function ViewNav({ view, onChange }: ViewNavProps) {
  return (
    <nav className="flex items-center gap-1" aria-label="Views">
      {VIEWS.map((item) => (
        <Button
          key={item.value}
          variant="ghost"
          size="sm"
          aria-current={view === item.value}
          className={cn(
            view === item.value
              ? 'font-semibold text-foreground'
              : 'text-muted-foreground',
          )}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  )
}

export function App() {
  const health = useBackendHealth()
  const [view, setView] = useState<View>('practice')

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <h1 className="font-serif text-lg font-semibold">Diction</h1>
          <ViewNav view={view} onChange={setView} />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <BackendStatus health={health} />
          <ThemeToggle />
        </div>
      </header>
      <main>
        {view === 'practice' ? (
          <PassageScoring />
        ) : (
          <SessionHistory onStartPractice={() => setView('practice')} />
        )}
      </main>
    </div>
  )
}
