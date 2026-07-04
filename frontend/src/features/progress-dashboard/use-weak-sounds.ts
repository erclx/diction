import { useQuery } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'

import type { WeakSound } from './weak-sound'
import { WeakSoundListSchema } from './weak-sound'

const WEAK_SOUNDS_TIMEOUT_MS = 10_000
const WEAK_SOUNDS_STALE_MS = 30_000

const weakSoundsKey = ['weak-sounds'] as const

async function fetchWeakSounds(): Promise<WeakSound[]> {
  const response = await fetch(`${BACKEND_URL}/api/weak-sounds`, {
    signal: AbortSignal.timeout(WEAK_SOUNDS_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Failed to load weak sounds with status ${response.status}`)
  }

  return WeakSoundListSchema.parse(await response.json())
}

export function useWeakSoundsQuery() {
  return useQuery({
    queryKey: weakSoundsKey,
    queryFn: fetchWeakSounds,
    staleTime: WEAK_SOUNDS_STALE_MS,
    retry: false,
  })
}
