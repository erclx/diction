import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { StressIntonation } from './stress-intonation'

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

const ANALYZE_URL = 'http://localhost:8000/api/prosody/analyze'

const ANALYSIS = {
  rhythm_match: 88,
  intonation_match: 84,
  reference_contour: [0, 2, 4, 1, -2],
  learner_contour: [0, 1, 2, 0, -1],
  reference_timings: [
    [0, 0.4],
    [0.4, 1],
  ],
  stress_marks: [
    { word: 'banana', syllables: ['bə', 'nɑː', 'nə'], stress_index: 1 },
  ],
}

async function recordAndAnalyze(): Promise<void> {
  const user = userEvent.setup()
  const analyze = await screen.findByRole('button', { name: 'Analyze' })
  await user.click(analyze)
}

describe('StressIntonation', () => {
  it('should draw the contour and mark the stressed syllable after analyzing', async () => {
    server.use(http.post(ANALYZE_URL, () => HttpResponse.json(ANALYSIS)))
    renderWithProviders(<StressIntonation />)

    await recordAndAnalyze()

    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: /pitch contour/ }),
      ).toBeInTheDocument(),
    )
    const stressedSyllable = screen.getByText('nɑː')
    expect(stressedSyllable).toHaveClass('bg-primary')
  })

  it('should mark a word boundary on the contour for each gap between reference words', async () => {
    server.use(http.post(ANALYZE_URL, () => HttpResponse.json(ANALYSIS)))
    renderWithProviders(<StressIntonation />)

    await recordAndAnalyze()

    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: /pitch contour/ }),
      ).toBeInTheDocument(),
    )
    expect(screen.getAllByTestId('word-boundary')).toHaveLength(
      ANALYSIS.reference_timings.length - 1,
    )
  })

  it('should show the rhythm and intonation match scores after analyzing', async () => {
    server.use(http.post(ANALYZE_URL, () => HttpResponse.json(ANALYSIS)))
    renderWithProviders(<StressIntonation />)

    await recordAndAnalyze()

    await waitFor(() =>
      expect(screen.getByText('Rhythm match')).toBeInTheDocument(),
    )
    expect(screen.getByText('88')).toBeInTheDocument()
    expect(screen.getByText('84')).toBeInTheDocument()
    expect(screen.getByText(/directional read/)).toBeInTheDocument()
  })

  it('should surface an actionable message when analysis fails', async () => {
    server.use(
      http.post(ANALYZE_URL, () => new HttpResponse(null, { status: 500 })),
    )
    renderWithProviders(<StressIntonation />)

    await recordAndAnalyze()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Analysis failed/),
    )
  })

  it('should strip trailing punctuation from a stress-mark word label', async () => {
    server.use(
      http.post(ANALYZE_URL, () =>
        HttpResponse.json({
          ...ANALYSIS,
          stress_marks: [
            { word: 'money.', syllables: ['mʌ', 'ni'], stress_index: 0 },
          ],
        }),
      ),
    )
    renderWithProviders(<StressIntonation />)

    await recordAndAnalyze()

    await waitFor(() => expect(screen.getByText('money')).toBeInTheDocument())
    expect(screen.queryByText('money.')).not.toBeInTheDocument()
  })

  it('should surface the too-weak reason instead of the generic failure', async () => {
    server.use(
      http.post(ANALYZE_URL, () =>
        HttpResponse.json(
          { error: 'clip_too_weak', detail: 'Clip too short or quiet' },
          { status: 422 },
        ),
      ),
    )
    renderWithProviders(<StressIntonation />)

    await recordAndAnalyze()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/too short or quiet/),
    )
  })

  it('should replace the line with a generated one', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('http://localhost:8000/api/content/generate', () =>
        HttpResponse.json({ text: 'A freshly generated stress line.' }),
      ),
    )
    renderWithProviders(<StressIntonation />)

    await user.click(screen.getByRole('button', { name: 'Generate a line' }))

    await waitFor(() =>
      expect(
        screen.getByText('A freshly generated stress line.'),
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
    renderWithProviders(<StressIntonation />)

    await user.click(screen.getByRole('button', { name: 'Generate a line' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Generation failed/),
    )
  })
})
