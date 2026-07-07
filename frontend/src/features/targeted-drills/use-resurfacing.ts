import { useQuery } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'

import type { DueSound } from './due-sound'
import { DueSoundListSchema } from './due-sound'

const RESURFACING_TIMEOUT_MS = 10_000
const RESURFACING_STALE_MS = 30_000

const resurfacingKey = ['resurfacing'] as const

async function fetchResurfacing(): Promise<DueSound[]> {
  const response = await fetch(`${BACKEND_URL}/api/resurfacing`, {
    signal: AbortSignal.timeout(RESURFACING_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Failed to load resurfacing with status ${response.status}`)
  }

  return DueSoundListSchema.parse(await response.json())
}

export function useResurfacingQuery() {
  return useQuery({
    queryKey: resurfacingKey,
    queryFn: fetchResurfacing,
    staleTime: RESURFACING_STALE_MS,
    retry: false,
  })
}
