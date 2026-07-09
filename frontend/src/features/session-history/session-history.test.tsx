import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { SessionHistory } from './session-history'

describe('SessionHistory', () => {
  it('should render the session list when no session is selected', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/history" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history'] },
    )

    expect(await screen.findByText('92.2')).toBeInTheDocument()
    expect(screen.queryByText('Completeness')).not.toBeInTheDocument()
  })

  it('should render the session detail from the route param', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/12'] },
    )

    expect(await screen.findByText('Completeness')).toBeInTheDocument()
    expect(
      screen.getByText('The early bird catches the worm.'),
    ).toBeInTheDocument()
    expect(screen.getByText('thought', { exact: true })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Play your recording' }),
    ).toBeInTheDocument()
  })

  it('should show the transcript and critique for a free-topic session detail', async () => {
    server.use(
      http.get('http://localhost:8000/api/sessions/:id', () =>
        HttpResponse.json({
          id: 13,
          created_at: '2026-07-02T09:14:00Z',
          mode: 'free-topic',
          passage: null,
          transcript: 'we drives to the park before it start raining',
          critique:
            'Use past tense: say "we drove".\nSubject-verb agreement: "it started".',
          completeness: 100,
          accuracy: 91,
          fluency: 84,
          phoneme_quality: 88,
          has_recording: true,
          flagged_words: [],
        }),
      ),
    )
    renderWithProviders(
      <Routes>
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/13'] },
    )

    expect(await screen.findByText('Grammar and phrasing')).toBeInTheDocument()
    expect(screen.getByText(/we drove/)).toBeInTheDocument()
    expect(screen.getByText(/it started/)).toBeInTheDocument()
    expect(
      screen.getByText('we drives to the park before it start raining'),
    ).toBeInTheDocument()
  })

  it('should redirect an invalid session id to the list', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/history" element={<SessionHistory />} />
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/abc'] },
    )

    expect(await screen.findByText('92.2')).toBeInTheDocument()
    expect(screen.queryByText('Completeness')).not.toBeInTheDocument()
  })
})
