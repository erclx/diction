import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { BACKEND_URL } from '@/config'

const WordPairSchema = z.object({
  word_a: z.string(),
  word_b: z.string(),
})

const MinimalPairContrastSchema = z.object({
  phoneme_a: z.string(),
  phoneme_b: z.string(),
  label: z.string(),
  pairs: z.array(WordPairSchema),
})

const MinimalPairContrastsSchema = z.array(MinimalPairContrastSchema)

export type WordPair = z.infer<typeof WordPairSchema>
export type MinimalPairContrast = z.infer<typeof MinimalPairContrastSchema>

async function fetchMinimalPairs(): Promise<MinimalPairContrast[]> {
  const response = await fetch(`${BACKEND_URL}/api/minimal-pairs`)

  if (!response.ok) {
    throw new Error(`Minimal pairs fetch failed with status ${response.status}`)
  }

  return MinimalPairContrastsSchema.parse(await response.json())
}

const MINIMAL_PAIRS_QUERY_KEY = ['minimal-pairs'] as const

export function useMinimalPairs() {
  return useQuery({
    queryKey: MINIMAL_PAIRS_QUERY_KEY,
    queryFn: fetchMinimalPairs,
    staleTime: Infinity,
  })
}
