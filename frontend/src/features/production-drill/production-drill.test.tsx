import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { ProductionDrill } from './production-drill'

const { recorderMock } = vi.hoisted(() => ({
  recorderMock: {
    status: 'recorded' as const,
    recording: {
      blob: new Blob(['clip'], { type: 'audio/webm' }),
      url: 'blob:mock',
    },
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  },
}))

vi.mock('@/features/passage-scoring/use-recorder', () => ({
  useRecorder: () => recorderMock,
}))

const SCORE_URL = 'http://localhost:8000/api/drills/minimal-pair/score'

async function recordAndCheck(): Promise<void> {
  const user = userEvent.setup()
  const check = await screen.findByRole('button', { name: 'Check' })
  await user.click(check)
}

describe('ProductionDrill', () => {
  it('should show the pass state when the target sound is not flagged', async () => {
    renderWithProviders(<ProductionDrill />)

    await recordAndCheck()

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/landed/),
    )
  })

  it('should show the retry state when the target sound is flagged', async () => {
    server.use(
      http.post(SCORE_URL, () =>
        HttpResponse.json({
          flagged_words: [
            {
              word: 'walk',
              start: 0.1,
              end: 0.5,
              phoneme: 'ɔ',
              explanation: 'Round the vowel more.',
            },
          ],
        }),
      ),
    )
    renderWithProviders(<ProductionDrill />)

    await recordAndCheck()

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/try/i),
    )
  })

  it('should surface an actionable message when the clip is too weak', async () => {
    server.use(
      http.post(SCORE_URL, () =>
        HttpResponse.json(
          {
            error: 'clip_too_weak',
            detail: 'duration=0.4s below 1.0s minimum',
          },
          { status: 422 },
        ),
      ),
    )
    renderWithProviders(<ProductionDrill />)

    await recordAndCheck()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/too short or quiet/),
    )
  })
})
