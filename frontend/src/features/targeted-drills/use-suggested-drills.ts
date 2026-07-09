import { useMemo } from 'react'

import type { MinimalPairContrast } from '@/features/minimal-pairs/minimal-pair'
import { contrastForPhoneme } from '@/features/minimal-pairs/minimal-pair'
import { useMinimalPairsQuery } from '@/features/minimal-pairs/use-minimal-pairs'
import { useWeakSoundsQuery } from '@/features/progress-dashboard/use-weak-sounds'
import type { WeakSound } from '@/features/progress-dashboard/weak-sound'

import type { DueSound } from './due-sound'
import { useResurfacingQuery } from './use-resurfacing'

const SUGGESTION_LIMIT = 5

export interface SuggestedDrill {
  phoneme: string
  badge: string
  exampleWords: readonly string[]
  contrast: MinimalPairContrast | null
}

function dueSuggestions(
  dueSounds: readonly DueSound[],
  contrasts: readonly MinimalPairContrast[],
): SuggestedDrill[] {
  return dueSounds.slice(0, SUGGESTION_LIMIT).map((dueSound) => ({
    phoneme: dueSound.phoneme,
    badge: 'Due',
    exampleWords: dueSound.example_words,
    contrast: contrastForPhoneme(contrasts, dueSound.phoneme),
  }))
}

function weakSoundSuggestions(
  weakSounds: readonly WeakSound[],
  contrasts: readonly MinimalPairContrast[],
): SuggestedDrill[] {
  return weakSounds.slice(0, SUGGESTION_LIMIT).map((weakSound) => ({
    phoneme: weakSound.phoneme,
    badge: `${weakSound.occurrence_count}x`,
    exampleWords: weakSound.example_words,
    contrast: contrastForPhoneme(contrasts, weakSound.phoneme),
  }))
}

function buildSuggestions(
  dueSounds: readonly DueSound[],
  weakSounds: readonly WeakSound[],
  contrasts: readonly MinimalPairContrast[],
): SuggestedDrill[] {
  const due = dueSounds.filter((dueSound) => dueSound.is_due)
  if (due.length > 0) {
    return dueSuggestions(due, contrasts)
  }
  return weakSoundSuggestions(weakSounds, contrasts)
}

export interface SuggestedDrillsResult {
  suggestions: readonly SuggestedDrill[]
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  refetch: () => void
}

export function useSuggestedDrills(): SuggestedDrillsResult {
  const resurfacingQuery = useResurfacingQuery()
  const weakSoundsQuery = useWeakSoundsQuery()
  const minimalPairsQuery = useMinimalPairsQuery()

  const suggestions = useMemo(() => {
    if (
      weakSoundsQuery.data === undefined ||
      minimalPairsQuery.data === undefined
    ) {
      return []
    }
    return buildSuggestions(
      resurfacingQuery.data ?? [],
      weakSoundsQuery.data,
      minimalPairsQuery.data,
    )
  }, [resurfacingQuery.data, weakSoundsQuery.data, minimalPairsQuery.data])

  return {
    suggestions,
    isPending: weakSoundsQuery.isPending || minimalPairsQuery.isPending,
    isError: weakSoundsQuery.isError || minimalPairsQuery.isError,
    isSuccess: weakSoundsQuery.isSuccess && minimalPairsQuery.isSuccess,
    refetch: () => {
      void resurfacingQuery.refetch()
      void weakSoundsQuery.refetch()
      void minimalPairsQuery.refetch()
    },
  }
}
