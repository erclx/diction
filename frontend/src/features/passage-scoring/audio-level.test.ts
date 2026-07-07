import { describe, expect, it } from 'vitest'

import { computeRmsLevel, meterLevelFromRms } from './audio-level'

describe('computeRmsLevel', () => {
  it('should return zero for an empty sample buffer', () => {
    const level = computeRmsLevel(new Float32Array())

    expect(level).toBe(0)
  })

  it('should return zero for pure silence', () => {
    const level = computeRmsLevel(new Float32Array([0, 0, 0, 0]))

    expect(level).toBe(0)
  })

  it('should return the amplitude for a constant full-scale signal', () => {
    const level = computeRmsLevel(new Float32Array([1, -1, 1, -1]))

    expect(level).toBe(1)
  })

  it('should read a louder signal as a higher level than a quieter one', () => {
    const quiet = computeRmsLevel(new Float32Array([0.1, -0.1, 0.1, -0.1]))
    const loud = computeRmsLevel(new Float32Array([0.8, -0.8, 0.8, -0.8]))

    expect(loud).toBeGreaterThan(quiet)
  })
})

describe('meterLevelFromRms', () => {
  it('should stay at zero for silence', () => {
    expect(meterLevelFromRms(0)).toBe(0)
  })

  it('should lift a typical speech rms well above a single bar', () => {
    const level = meterLevelFromRms(0.1)

    expect(level).toBeGreaterThan(0.6)
  })

  it('should saturate at one for a loud signal rather than overshoot', () => {
    expect(meterLevelFromRms(0.5)).toBe(1)
  })
})
