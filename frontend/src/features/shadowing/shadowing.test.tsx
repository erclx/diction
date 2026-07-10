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

  it('should surface the too-weak reason instead of the generic failure', async () => {
    server.use(
      http.post(SCORE_URL, () =>
        HttpResponse.json(
          { error: 'clip_too_weak', detail: 'Clip too short or quiet' },
          { status: 422 },
        ),
      ),
    )
    renderWithProviders(<Shadowing />)

    await recordAndScore()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/too short or quiet/),
    )
  })

  it('should replace the line with a generated one', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('http://localhost:8000/api/content/generate', () =>
        HttpResponse.json({ text: 'A freshly generated shadowing line.' }),
      ),
    )
    renderWithProviders(<Shadowing />)

    await user.click(screen.getByRole('button', { name: 'Generate a line' }))

    await waitFor(() =>
      expect(
        screen.getByText('A freshly generated shadowing line.'),
      ).toBeInTheDocument(),
    )
  })

  it('should surface an actionable message when generation fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.post(
        'http://localhost:8000/api/content/generate',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    renderWithProviders(<Shadowing />)

    await user.click(screen.getByRole('button', { name: 'Generate a line' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Generation failed/),
    )
  })

  it('should clear the generation error when advancing to the next line', async () => {
    const user = userEvent.setup()
    server.use(
      http.post(
        'http://localhost:8000/api/content/generate',
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.post(SCORE_URL, () =>
        HttpResponse.json({ rhythm_match: 88, intonation_match: 84 }),
      ),
    )
    renderWithProviders(<Shadowing />)

    await user.click(screen.getByRole('button', { name: 'Generate a line' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Generation failed/),
    )
    await user.click(screen.getByRole('button', { name: 'Score' }))
    await waitFor(() =>
      expect(screen.getByText('Rhythm match')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Next line' }))

    expect(screen.queryByText(/Generation failed/)).not.toBeInTheDocument()
  })
})
