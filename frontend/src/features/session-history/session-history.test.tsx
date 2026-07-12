import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

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

  it('should play the recording span for a flagged word when the session has a recording', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/12'] },
    )

    expect(
      await screen.findByRole('button', {
        name: 'Play your recording of thought',
      }),
    ).toBeInTheDocument()
  })

  it('should show only the reference for a flagged word when the session has no recording', async () => {
    server.use(
      http.get('http://localhost:8000/api/sessions/:id', () =>
        HttpResponse.json({
          id: 14,
          created_at: '2026-07-02T09:14:00Z',
          mode: 'passage',
          passage: 'The early bird catches the worm.',
          prompt: null,
          transcript: null,
          critique: null,
          completeness: 90.9,
          accuracy: 92.2,
          fluency: 98,
          phoneme_quality: 94,
          has_recording: false,
          cv: null,
          flagged_words: [
            {
              word: 'thought',
              start: 6.19,
              end: 6.59,
              phoneme: 'θ',
              explanation: 'Say th, not t.',
            },
          ],
        }),
      ),
    )
    renderWithProviders(
      <Routes>
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/14'] },
    )

    expect(
      await screen.findByRole('button', {
        name: 'Play native reference for thought',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Play your recording of thought',
      }),
    ).not.toBeInTheDocument()
  })

  it('should show the transcript and critique for a free-topic session detail', async () => {
    server.use(
      http.get('http://localhost:8000/api/sessions/:id', () =>
        HttpResponse.json({
          id: 13,
          created_at: '2026-07-02T09:14:00Z',
          mode: 'free-topic',
          passage: null,
          prompt: null,
          transcript: 'we drives to the park before it start raining',
          critique:
            'Use past tense: say "we drove".\nSubject-verb agreement: "it started".',
          completeness: 100,
          accuracy: 91,
          fluency: 84,
          phoneme_quality: 88,
          has_recording: true,
          cv: null,
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

  it('should render the question, delivery metrics, and video for an interview session detail', async () => {
    server.use(
      http.get('http://localhost:8000/api/sessions/:id', () =>
        HttpResponse.json({
          id: 15,
          created_at: '2026-07-02T09:14:00Z',
          mode: 'interview',
          passage: 'I led the migration and cut latency in half.',
          prompt: 'Tell me about a time you solved a hard problem.',
          transcript: 'i led the migration and cut latency in half',
          critique: null,
          completeness: 100,
          accuracy: 90,
          fluency: 85,
          phoneme_quality: 88,
          has_recording: true,
          cv: {
            posture: {
              stability: 0.82,
              gesture_ratio: 0.12,
              shoulder_tilt_deg: 6,
            },
            eye_contact: { looking_pct: 94 },
          },
          flagged_words: [],
        }),
      ),
    )
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/15'] },
    )

    expect(await screen.findByText('Question')).toBeInTheDocument()
    expect(
      screen.getByText('Tell me about a time you solved a hard problem.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Answer to rehearse')).toBeInTheDocument()
    expect(screen.getByText('Delivery')).toBeInTheDocument()
    expect(container.querySelector('video')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Play your recording' }),
    ).not.toBeInTheDocument()
  })

  it('should hide the delivery metrics for an interview session with no cv report', async () => {
    server.use(
      http.get('http://localhost:8000/api/sessions/:id', () =>
        HttpResponse.json({
          id: 16,
          created_at: '2026-07-02T09:14:00Z',
          mode: 'interview',
          passage: 'I led the migration and cut latency in half.',
          prompt: 'Tell me about a time you solved a hard problem.',
          transcript: 'i led the migration',
          critique: null,
          completeness: 100,
          accuracy: 90,
          fluency: 85,
          phoneme_quality: 88,
          has_recording: true,
          cv: null,
          flagged_words: [],
        }),
      ),
    )
    renderWithProviders(
      <Routes>
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/16'] },
    )

    expect(await screen.findByText('Question')).toBeInTheDocument()
    expect(screen.queryByText('Delivery')).not.toBeInTheDocument()
  })

  it('should not render the question or delivery blocks for a passage session detail', async () => {
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/12'] },
    )

    expect(await screen.findByText('Completeness')).toBeInTheDocument()
    expect(screen.queryByText('Question')).not.toBeInTheDocument()
    expect(screen.queryByText('Delivery')).not.toBeInTheDocument()
    expect(container.querySelector('video')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Play your recording' }),
    ).toBeInTheDocument()
  })

  it('should delete the session and return to the list once the confirm is accepted', async () => {
    const deleteSpy = vi.fn()
    server.use(
      http.delete(
        'http://localhost:8000/api/sessions/:id',
        () => (deleteSpy(), new HttpResponse(null, { status: 204 })),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/history" element={<SessionHistory />} />
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/12'] },
    )

    await user.click(
      await screen.findByRole('button', { name: 'Delete session' }),
    )
    const dialog = await screen.findByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete session' }),
    )

    expect(await screen.findByText('92.2')).toBeInTheDocument()
    expect(screen.queryByText('Completeness')).not.toBeInTheDocument()
    expect(deleteSpy).toHaveBeenCalledTimes(1)
  })

  it('should not delete the session when the confirm is cancelled', async () => {
    const deleteSpy = vi.fn()
    server.use(
      http.delete(
        'http://localhost:8000/api/sessions/:id',
        () => (deleteSpy(), new HttpResponse(null, { status: 204 })),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/history" element={<SessionHistory />} />
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/12'] },
    )

    await user.click(
      await screen.findByRole('button', { name: 'Delete session' }),
    )
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Completeness')).toBeInTheDocument()
    expect(deleteSpy).not.toHaveBeenCalled()
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
