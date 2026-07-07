import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { MetricCard } from './metric-card'

describe('MetricCard', () => {
  it('should render its label and display value', () => {
    render(<MetricCard label="Accuracy" display="88" />)

    expect(screen.getByText('Accuracy')).toBeInTheDocument()
    expect(screen.getByText('88')).toBeInTheDocument()
  })

  it('should reveal the directional caveat when the info affordance is focused', async () => {
    const user = userEvent.setup()
    render(<MetricCard label="Accuracy" display="88" />)

    await user.tab()

    await waitFor(() =>
      expect(
        screen.getByRole('tooltip', { name: /directional read/ }),
      ).toBeInTheDocument(),
    )
  })
})
