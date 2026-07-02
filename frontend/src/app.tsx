import { PassageScoring } from '@/features/passage-scoring/passage-scoring'

import { useBackendHealth } from './use-backend-health'

export function App() {
  const health = useBackendHealth()

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">Diction</h1>
        <p
          className="font-mono text-xs text-muted-foreground"
          data-testid="backend-status"
        >
          Backend: {health}
        </p>
      </header>
      <main>
        <PassageScoring />
      </main>
    </div>
  )
}
