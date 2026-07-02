import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './app'

describe('App', () => {
  it('should render the app title', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Diction' })).toBeInTheDocument()
  })

  it('should report backend health once the check resolves', async () => {
    render(<App />)

    expect(await screen.findByText('Backend: ok')).toBeInTheDocument()
  })
})
