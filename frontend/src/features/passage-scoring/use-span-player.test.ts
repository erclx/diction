import { describe, expect, it } from 'vitest'

import { padSpan, SPAN_PAD_SECONDS } from './use-span-player'

describe('padSpan', () => {
  it('should add the margin on both sides of a mid-clip span', () => {
    const result = padSpan(1, 1.4, 10, 0.1)

    expect(result).toEqual({ offset: 0.9, duration: 0.6 })
  })

  it('should clamp the offset at zero when the span starts near the clip head', () => {
    const result = padSpan(0.05, 0.3, 10, 0.1)

    expect(result.offset).toBe(0)
    expect(result.duration).toBeCloseTo(0.4)
  })

  it('should clamp the end at the clip duration when the span reaches the tail', () => {
    const result = padSpan(9.7, 9.95, 10, 0.1)

    expect(result.offset).toBeCloseTo(9.6)
    expect(result.duration).toBeCloseTo(0.4)
  })

  it('should default to the shared pad constant when no pad is given', () => {
    const withDefault = padSpan(2, 2.5, 10)
    const withConstant = padSpan(2, 2.5, 10, SPAN_PAD_SECONDS)

    expect(withDefault).toEqual(withConstant)
  })
})
