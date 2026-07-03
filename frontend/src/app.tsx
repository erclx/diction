import { PassageScoring } from '@/features/passage-scoring/passage-scoring'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { cn } from '@/lib/utils'

import type { HealthState } from './use-backend-health'
import { useBackendHealth } from './use-backend-health'

const STATUS_DOT: Record<HealthState, string> = {
  checking: 'bg-muted-foreground',
  ok: 'bg-success',
  error: 'bg-destructive',
}

interface BackendStatusProps {
  health: HealthState
}

function BackendStatus({ health }: BackendStatusProps) {
  return (
    <div
      className="flex items-center gap-2 text-xs text-muted-foreground"
      data-testid="backend-status"
    >
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[health])} />
      <span className="font-mono">Backend: {health}</span>
    </div>
  )
}

export function App() {
  const health = useBackendHealth()

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="font-serif text-lg font-semibold">Diction</h1>
        <div className="flex items-center gap-3">
          <BackendStatus health={health} />
          <ThemeToggle />
        </div>
      </header>
      <main>
        <PassageScoring />
      </main>
    </div>
  )
}
