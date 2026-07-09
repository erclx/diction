import { describe, expect, it } from 'vitest'

import type { MinimalPairContrast } from '@/features/minimal-pairs/minimal-pair'
import type { DueSound } from '@/features/targeted-drills/due-sound'
import type { WeakSound } from '@/features/progress-dashboard/weak-sound'

import { ROUTINE_LIMIT, buildRoutine } from './routine-step'

const CONTRASTS: MinimalPairContrast[] = [
  {
    phoneme_a: 'θ',
    phoneme_b: 'f',
    label: 'th vs f',
    pairs: [{ word_a: 'thin', word_b: 'fin' }],
  },
  {
    phoneme_a: 'ɹ',
    phoneme_b: 'l',
    label: 'r vs l',
    pairs: [{ word_a: 'road', word_b: 'load' }],
  },
]

function dueSound(phoneme: string, isDue: boolean): DueSound {
  return {
    phoneme,
    box: 0,
    interval_days: 1,
    last_practiced: '2026-07-01T09:14:00Z',
    next_due: '2026-07-02T09:14:00Z',
    is_due: isDue,
    example_words: [],
  }
}

function weakSound(phoneme: string): WeakSound {
  return {
    phoneme,
    occurrence_count: 4,
    word_count: 1,
    example_words: [],
    first_seen: '2026-06-28T07:41:00Z',
    last_seen: '2026-07-02T09:14:00Z',
  }
}

describe('buildRoutine', () => {
  it('should lead with a due sound as a minimal-pair drill step', () => {
    const routine = buildRoutine(
      [dueSound('ɹ', true)],
      [weakSound('θ')],
      CONTRASTS,
    )

    expect(routine[0].reason).toBe('Due for review')
    expect(routine[0].phoneme).toBe('ɹ')
    expect(routine[0].contrast?.label).toBe('r vs l')
    expect(['production', 'ear-training']).toContain(routine[0].mode.id)
  })

  it('should interleave fixed-content modes so no two adjacent steps share a mode', () => {
    const routine = buildRoutine(
      [dueSound('ɹ', true), dueSound('θ', true)],
      [],
      CONTRASTS,
    )

    routine.slice(1).forEach((step, index) => {
      expect(step.mode.id).not.toBe(routine[index].mode.id)
    })
  })

  it('should fall back to the weak-sound ranking when nothing is due', () => {
    const routine = buildRoutine(
      [dueSound('ɹ', false)],
      [weakSound('θ')],
      CONTRASTS,
    )

    const drillStep = routine.find((step) => step.phoneme !== null)
    expect(drillStep?.reason).toBe('Weak sound')
    expect(drillStep?.phoneme).toBe('θ')
  })

  it('should give a fixed starter rotation on a cold start with no signals', () => {
    const routine = buildRoutine([], [], CONTRASTS)

    expect(routine.map((step) => step.mode.id)).toEqual([
      'passage',
      'shadowing',
      'stress',
    ])
    expect(routine.every((step) => step.phoneme === null)).toBe(true)
  })

  it('should cap the routine at the sitting length', () => {
    const manyDue = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((phoneme) =>
      dueSound(phoneme, true),
    )
    const routine = buildRoutine(manyDue, [], CONTRASTS)

    expect(routine).toHaveLength(ROUTINE_LIMIT)
  })
})
