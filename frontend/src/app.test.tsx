import { screen, within } from '@testing-library/react'
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

  it('should show the passage reading prompt at the root route', () => {
    renderWithProviders(<App />, { initialEntries: ['/'] })

    expect(screen.getByText(/Read the passage aloud/)).toBeInTheDocument()
  })

  it('should show the session history at the history route', async () => {
    renderWithProviders(<App />, { initialEntries: ['/history'] })

    expect(
      screen.getByRole('heading', { name: 'Session history' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('92.2')).toBeInTheDocument()
  })

  it('should render every nav item in the sidebar', () => {
    renderWithProviders(<App />)

    const nav = screen.getByRole('navigation', { name: 'Views' })

    expect(
      within(nav).getByRole('link', { name: 'Passage' }),
    ).toBeInTheDocument()
    expect(
      within(nav).getByRole('link', { name: 'History' }),
    ).toBeInTheDocument()
    expect(
      within(nav).getByRole('link', { name: 'Progress' }),
    ).toBeInTheDocument()
  })

  it('should group the primary practice modes under a Practice label', () => {
    renderWithProviders(<App />)

    const nav = screen.getByRole('navigation', { name: 'Views' })

    expect(within(nav).getByText('Practice')).toBeInTheDocument()
  })

  it('should mark the nav item for the current route as active', () => {
    renderWithProviders(<App />, { initialEntries: ['/progress'] })

    const nav = screen.getByRole('navigation', { name: 'Views' })

    expect(within(nav).getByRole('link', { name: 'Progress' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      within(nav).getByRole('link', { name: 'Passage' }),
    ).not.toHaveAttribute('aria-current')
  })
})
