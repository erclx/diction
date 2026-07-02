import { useEffect, useState } from 'react'

export type HealthState = 'checking' | 'ok' | 'error'

const BACKEND_URL = 'http://localhost:8000'

export function useBackendHealth(): HealthState {
  const [health, setHealth] = useState<HealthState>('checking')

  useEffect(() => {
    const controller = new AbortController()

    async function checkHealth(): Promise<void> {
      try {
        const response = await fetch(`${BACKEND_URL}/api/health`, {
          signal: controller.signal,
        })
        setHealth(response.ok ? 'ok' : 'error')
      } catch {
        if (!controller.signal.aborted) {
          setHealth('error')
        }
      }
    }

    void checkHealth()

    return () => controller.abort()
  }, [])

  return health
}
