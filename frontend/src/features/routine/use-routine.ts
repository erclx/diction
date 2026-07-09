import { useMemo } from 'react'

import { useMinimalPairsQuery } from '@/features/minimal-pairs/use-minimal-pairs'
import { useWeakSoundsQuery } from '@/features/progress-dashboard/use-weak-sounds'
import { useResurfacingQuery } from '@/features/targeted-drills/use-resurfacing'

import type { RoutineStep } from './routine-step'
import { buildRoutine } from './routine-step'

export interface RoutineResult {
  steps: readonly RoutineStep[]
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  refetch: () => void
}

export function useRoutine(): RoutineResult {
  const resurfacingQuery = useResurfacingQuery()
  const weakSoundsQuery = useWeakSoundsQuery()
  const minimalPairsQuery = useMinimalPairsQuery()

  const steps = useMemo(() => {
    if (
      weakSoundsQuery.data === undefined ||
      minimalPairsQuery.data === undefined
    ) {
      return []
    }
    return buildRoutine(
      resurfacingQuery.data ?? [],
      weakSoundsQuery.data,
      minimalPairsQuery.data,
    )
  }, [resurfacingQuery.data, weakSoundsQuery.data, minimalPairsQuery.data])

  return {
    steps,
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
