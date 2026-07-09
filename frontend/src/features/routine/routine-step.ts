import type { MinimalPairContrast } from '@/features/minimal-pairs/minimal-pair'
import { contrastForPhoneme } from '@/features/minimal-pairs/minimal-pair'
import type { DueSound } from '@/features/targeted-drills/due-sound'
import type { WeakSound } from '@/features/progress-dashboard/weak-sound'

import type { RoutineMode, RoutineModeId } from './modes'
import { ROUTINE_MODES } from './modes'

export const ROUTINE_LIMIT = 5

export interface RoutineStep {
  mode: RoutineMode
  phoneme: string | null
  contrast: MinimalPairContrast | null
  reason: string
}

const DUE_REASON = 'Due for review'
const WEAK_REASON = 'Weak sound'

const FIXED_REASONS: Record<'passage' | 'shadowing' | 'stress', string> = {
  passage: 'Read a full passage',
  shadowing: 'Match a native rhythm',
  stress: 'Trace stress and pitch',
}

const DRILL_ROTATION: readonly RoutineModeId[] = ['production', 'ear-training']
const FIXED_ROTATION: readonly ('passage' | 'shadowing' | 'stress')[] = [
  'passage',
  'shadowing',
  'stress',
]

function drillSteps(
  phonemes: readonly string[],
  reason: string,
  contrasts: readonly MinimalPairContrast[],
): RoutineStep[] {
  return phonemes.map((phoneme, index) => ({
    mode: ROUTINE_MODES[DRILL_ROTATION[index % DRILL_ROTATION.length]],
    phoneme,
    contrast: contrastForPhoneme(contrasts, phoneme),
    reason,
  }))
}

function fixedSteps(): RoutineStep[] {
  return FIXED_ROTATION.map((id) => ({
    mode: ROUTINE_MODES[id],
    phoneme: null,
    contrast: null,
    reason: FIXED_REASONS[id],
  }))
}

function weave(drills: RoutineStep[], fixed: RoutineStep[]): RoutineStep[] {
  const woven: RoutineStep[] = []
  let drillIndex = 0
  let fixedIndex = 0
  let takeDrill = drills.length > 0

  while (
    woven.length < ROUTINE_LIMIT &&
    (drillIndex < drills.length || fixedIndex < fixed.length)
  ) {
    const drillAvailable = drillIndex < drills.length
    const fixedAvailable = fixedIndex < fixed.length
    const pullDrill = drillAvailable && (takeDrill || !fixedAvailable)

    woven.push(pullDrill ? drills[drillIndex++] : fixed[fixedIndex++])
    takeDrill = !takeDrill
  }

  return woven
}

export function buildRoutine(
  dueSounds: readonly DueSound[],
  weakSounds: readonly WeakSound[],
  contrasts: readonly MinimalPairContrast[],
): RoutineStep[] {
  const due = dueSounds
    .filter((dueSound) => dueSound.is_due)
    .map((dueSound) => dueSound.phoneme)
  if (due.length > 0) {
    return weave(drillSteps(due, DUE_REASON, contrasts), fixedSteps())
  }

  const weak = weakSounds.map((weakSound) => weakSound.phoneme)
  return weave(drillSteps(weak, WEAK_REASON, contrasts), fixedSteps())
}
