import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { PassageScoring } from '@/features/passage-scoring/passage-scoring'
import { ProgressDashboard } from '@/features/progress-dashboard/progress-dashboard'
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

const NAV_ITEMS: readonly { to: string; label: string }[] = [
  { to: '/', label: 'Practice' },
  { to: '/history', label: 'History' },
  { to: '/progress', label: 'Progress' },
]

function ViewNav() {
  return (
    <nav className="flex items-center gap-1" aria-label="Views">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              isActive
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function App() {
  const health = useBackendHealth()

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <h1 className="font-serif text-lg font-semibold">Diction</h1>
          <ViewNav />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <BackendStatus health={health} />
          <ThemeToggle />
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<PassageScoring />} />
          <Route path="/history" element={<SessionHistory />} />
          <Route path="/history/:sessionId" element={<SessionHistory />} />
          <Route path="/progress" element={<ProgressDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
