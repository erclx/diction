import { useMemo } from 'react'

import type { MinimalPairContrast } from '@/features/minimal-pairs/minimal-pair'
import { useMinimalPairsQuery } from '@/features/minimal-pairs/use-minimal-pairs'
import { useWeakSoundsQuery } from '@/features/progress-dashboard/use-weak-sounds'
import type { WeakSound } from '@/features/progress-dashboard/weak-sound'

const SUGGESTION_LIMIT = 5

export interface SuggestedDrill {
  phoneme: string
  occurrenceCount: number
  exampleWords: readonly string[]
  contrast: MinimalPairContrast | null
}

function contrastForPhoneme(
  contrasts: readonly MinimalPairContrast[],
  phoneme: string,
): MinimalPairContrast | null {
  return (
    contrasts.find(
      (contrast) =>
        contrast.phoneme_a === phoneme || contrast.phoneme_b === phoneme,
    ) ?? null
  )
}

function buildSuggestions(
  weakSounds: readonly WeakSound[],
  contrasts: readonly MinimalPairContrast[],
): SuggestedDrill[] {
  return weakSounds.slice(0, SUGGESTION_LIMIT).map((weakSound) => ({
    phoneme: weakSound.phoneme,
    occurrenceCount: weakSound.occurrence_count,
    exampleWords: weakSound.example_words,
    contrast: contrastForPhoneme(contrasts, weakSound.phoneme),
  }))
}

export interface SuggestedDrillsResult {
  suggestions: readonly SuggestedDrill[]
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  refetch: () => void
}

export function useSuggestedDrills(): SuggestedDrillsResult {
  const weakSoundsQuery = useWeakSoundsQuery()
  const minimalPairsQuery = useMinimalPairsQuery()

  const suggestions = useMemo(() => {
    if (
      weakSoundsQuery.data === undefined ||
      minimalPairsQuery.data === undefined
    ) {
      return []
    }
    return buildSuggestions(weakSoundsQuery.data, minimalPairsQuery.data)
  }, [weakSoundsQuery.data, minimalPairsQuery.data])

  return {
    suggestions,
    isPending: weakSoundsQuery.isPending || minimalPairsQuery.isPending,
    isError: weakSoundsQuery.isError || minimalPairsQuery.isError,
    isSuccess: weakSoundsQuery.isSuccess && minimalPairsQuery.isSuccess,
    refetch: () => {
      void weakSoundsQuery.refetch()
      void minimalPairsQuery.refetch()
    },
  }
}
