import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { SessionList } from './session-list'

describe('SessionList', () => {
  it('should render saved sessions newest-first with a headline score', async () => {
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

    renderWithProviders(
      <SessionList onSelect={vi.fn()} onStartPractice={vi.fn()} />,
    )

    expect(await screen.findByText('92.2')).toBeInTheDocument()
    expect(screen.getByText('passage')).toBeInTheDocument()
  })

  it('should show an onboarding empty state with a next action', async () => {
    server.use(
      http.get('http://localhost:8000/api/sessions', () =>
        HttpResponse.json([]),
      ),
    )

    renderWithProviders(
      <SessionList onSelect={vi.fn()} onStartPractice={vi.fn()} />,
    )

    expect(await screen.findByText(/No sessions yet/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Read a passage' }),
    ).toBeInTheDocument()
  })
})
