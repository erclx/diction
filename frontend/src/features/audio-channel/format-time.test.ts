import { describe, expect, it } from 'vitest'

import { formatTime } from './format-time'

describe('formatTime', () => {
  it('should render whole seconds as minutes and zero-padded seconds', () => {
    expect(formatTime(21)).toBe('0:21')
  })

  it('should carry into minutes past sixty seconds', () => {
    expect(formatTime(83)).toBe('1:23')
  })

  it('should fall back to zero for a non-finite duration', () => {
    expect(formatTime(Infinity)).toBe('0:00')
  })

  it('should fall back to zero for a negative time', () => {
    expect(formatTime(-4)).toBe('0:00')
  })
})
