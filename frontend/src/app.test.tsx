import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './app'
import { renderWithProviders } from './test/render'

describe('App', () => {
  it('should render the app title', () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('heading', { name: 'Diction' })).toBeInTheDocument()
  })

  it('should report backend health once the check resolves', async () => {
    renderWithProviders(<App />)

    expect(await screen.findByText('Backend: ok')).toBeInTheDocument()
  })

  it('should show the passage reading prompt', () => {
    renderWithProviders(<App />)

    expect(screen.getByText(/Read the passage aloud/)).toBeInTheDocument()
  })
})
