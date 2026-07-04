import { useQuery } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'

import type { MinimalPairContrast } from './minimal-pair'
import { MinimalPairContrastListSchema } from './minimal-pair'

const MINIMAL_PAIRS_TIMEOUT_MS = 10_000

const minimalPairsKey = ['minimal-pairs'] as const

async function fetchMinimalPairs(): Promise<MinimalPairContrast[]> {
  const response = await fetch(`${BACKEND_URL}/api/minimal-pairs`, {
    signal: AbortSignal.timeout(MINIMAL_PAIRS_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to load minimal pairs with status ${response.status}`,
    )
  }

  return MinimalPairContrastListSchema.parse(await response.json())
}

export function useMinimalPairsQuery() {
  return useQuery({
    queryKey: minimalPairsKey,
    queryFn: fetchMinimalPairs,
    staleTime: Infinity,
    retry: false,
  })
}
