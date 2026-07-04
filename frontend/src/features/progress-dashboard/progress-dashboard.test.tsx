import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { ProgressDashboard } from './progress-dashboard'

const WEAK_SOUNDS_URL = 'http://localhost:8000/api/weak-sounds'
const SESSIONS_URL = 'http://localhost:8000/api/sessions'

describe('ProgressDashboard', () => {
  it('should render a ranked weak-sound list from the query', async () => {
    renderWithProviders(<ProgressDashboard />, {
      initialEntries: ['/progress'],
    })

    expect(await screen.findByText('θ')).toBeInTheDocument()
    expect(screen.getByText('thought, three, path')).toBeInTheDocument()
    expect(screen.getByText('5x')).toBeInTheDocument()
  })

  it('should show the weak-sound empty state when none are tracked', async () => {
    server.use(http.get(WEAK_SOUNDS_URL, () => HttpResponse.json([])))

    renderWithProviders(<ProgressDashboard />, {
      initialEntries: ['/progress'],
    })

    expect(await screen.findByText(/No weak sounds yet/)).toBeInTheDocument()
  })

  it('should render the score trend from seeded sessions', async () => {
    renderWithProviders(<ProgressDashboard />, {
      initialEntries: ['/progress'],
    })

    expect(
      await screen.findByRole('img', {
        name: 'Score trend across past sessions',
      }),
    ).toBeInTheDocument()
  })

  it('should show the trend empty state at zero sessions', async () => {
    server.use(http.get(SESSIONS_URL, () => HttpResponse.json([])))

    renderWithProviders(<ProgressDashboard />, {
      initialEntries: ['/progress'],
    })

    expect(await screen.findByText(/No sessions yet/)).toBeInTheDocument()
  })
})
