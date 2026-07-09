import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { FreeTopic } from './free-topic'

const { recorderMock } = vi.hoisted(() => ({
  recorderMock: {
    status: 'recorded' as const,
    recording: {
      blob: new Blob(['clip'], { type: 'audio/webm' }),
      url: 'blob:mock',
    },
    level: 0,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  },
}))

vi.mock('@/features/passage-scoring/use-recorder', () => ({
  useRecorder: () => recorderMock,
}))

const SCORE_URL = 'http://localhost:8000/api/free-topic/score'

const SCORE_BODY = {
  completeness: 100,
  accuracy: 91,
  fluency: 84,
  phoneme_quality: 88,
  flagged_words: [
    {
      word: 'drives',
      start: 1.0,
      end: 1.4,
      phoneme: 'v',
      explanation: 'The /v/ sound in drives scored low.',
    },
  ],
  transcript: 'we drives to the park',
  critique: ['Use past tense: say "we drove", not "we drives".'],
}

async function score(): Promise<void> {
  const user = userEvent.setup()
  const button = await screen.findByRole('button', { name: 'Score' })
  await user.click(button)
}

describe('FreeTopic', () => {
  it('should show pronunciation scores, the critique, and the transcript after scoring', async () => {
    server.use(http.post(SCORE_URL, () => HttpResponse.json(SCORE_BODY)))
    renderWithProviders(<FreeTopic />)

    await score()

    await waitFor(() =>
      expect(screen.getByText('Grammar and phrasing')).toBeInTheDocument(),
    )
    expect(screen.getByText(/we drove/)).toBeInTheDocument()
    expect(screen.getByText('we drives to the park')).toBeInTheDocument()
    expect(screen.getByText('drives')).toBeInTheDocument()
  })

  it('should note that scores are relative to the recognized transcript', async () => {
    server.use(http.post(SCORE_URL, () => HttpResponse.json(SCORE_BODY)))
    renderWithProviders(<FreeTopic />)

    await score()

    await waitFor(() =>
      expect(screen.getByText(/directional guide/)).toBeInTheDocument(),
    )
  })

  it('should surface an actionable message when scoring fails', async () => {
    server.use(
      http.post(SCORE_URL, () => new HttpResponse(null, { status: 500 })),
    )
    renderWithProviders(<FreeTopic />)

    await score()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Scoring failed/),
    )
  })

  it('should surface the too-weak reason instead of the generic failure', async () => {
    server.use(
      http.post(SCORE_URL, () =>
        HttpResponse.json(
          { error: 'clip_too_weak', detail: 'Clip too short or quiet' },
          { status: 422 },
        ),
      ),
    )
    renderWithProviders(<FreeTopic />)

    await score()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/too short or quiet/),
    )
  })
})
