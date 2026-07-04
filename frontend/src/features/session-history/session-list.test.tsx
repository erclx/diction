import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { SessionList } from './session-list'

describe('SessionList', () => {
  it('should render saved sessions linking to the session route', async () => {
    server.use(
      http.get('http://localhost:8000/api/sessions', () =>
        HttpResponse.json([
          {
            id: 12,
            created_at: '2026-07-02T09:14:00Z',
            mode: 'passage',
            accuracy: 92.2,
            phoneme_quality: 94,
          },
        ]),
      ),
    )

    renderWithProviders(<SessionList />)

    expect(await screen.findByText('92.2')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/history/12')
  })

  it('should show an onboarding empty state linking to practice', async () => {
    server.use(
      http.get('http://localhost:8000/api/sessions', () =>
        HttpResponse.json([]),
      ),
    )

    renderWithProviders(<SessionList />)

    expect(await screen.findByText(/No sessions yet/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Read a passage' }),
    ).toHaveAttribute('href', '/')
  })
})
