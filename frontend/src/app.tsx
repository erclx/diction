import './app.css'

import { useBackendHealth } from './use-backend-health'

export function App() {
  const health = useBackendHealth()

  return (
    <main className="app">
      <h1>Diction</h1>
      <p className="tagline">Local pronunciation practice</p>
      <p className="status" data-testid="backend-status">
        Backend: {health}
      </p>
    </main>
  )
}
