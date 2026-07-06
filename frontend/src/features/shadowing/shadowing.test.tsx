import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { Shadowing } from './shadowing'

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

const SCORE_URL = 'http://localhost:8000/api/prosody/score'

async function recordAndScore(): Promise<void> {
  const user = userEvent.setup()
  const score = await screen.findByRole('button', { name: 'Score' })
  await user.click(score)
}

describe('Shadowing', () => {
  it('should render the rhythm and intonation match scores after scoring', async () => {
    server.use(
      http.post(SCORE_URL, () =>
        HttpResponse.json({ rhythm_match: 88, intonation_match: 84 }),
      ),
    )
    renderWithProviders(<Shadowing />)

    await recordAndScore()

    await waitFor(() =>
      expect(screen.getByText('Rhythm match')).toBeInTheDocument(),
    )
    expect(screen.getByText('88')).toBeInTheDocument()
    expect(screen.getByText('84')).toBeInTheDocument()
  })

  it('should show a directional caveat rather than a settled grade', async () => {
    server.use(
      http.post(SCORE_URL, () =>
        HttpResponse.json({ rhythm_match: 88, intonation_match: 84 }),
      ),
    )
    renderWithProviders(<Shadowing />)

    await recordAndScore()

    await waitFor(() =>
      expect(screen.getByText(/directional read/)).toBeInTheDocument(),
    )
  })

  it('should surface an actionable message when scoring fails', async () => {
    server.use(
      http.post(SCORE_URL, () => new HttpResponse(null, { status: 500 })),
    )
    renderWithProviders(<Shadowing />)

    await recordAndScore()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Scoring failed/),
    )
  })
})
