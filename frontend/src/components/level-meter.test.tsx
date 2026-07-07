import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LevelMeter } from './level-meter'

describe('LevelMeter', () => {
  it('should report the current input level on the meter', () => {
    render(<LevelMeter level={0.5} />)

    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0.5')
  })

  it('should clamp an out-of-range level into the meter bounds', () => {
    render(<LevelMeter level={2} />)

    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '1')
  })
})
