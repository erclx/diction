import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { Interview } from './interview'

const { recorderMock } = vi.hoisted(() => ({
  recorderMock: {
    status: 'recorded' as const,
    recording: {
      blob: new Blob(['clip'], { type: 'video/webm' }),
      url: 'blob:mock',
    },
    stream: null,
    level: 0,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  },
}))

vi.mock('./use-video-recorder', () => ({
  useVideoRecorder: () => recorderMock,
}))

const QUESTIONS_URL = 'http://localhost:8000/api/interview/questions'
const SCORE_URL = 'http://localhost:8000/api/interview/score'

const QUESTIONS = [
  {
    category: 'Leadership',
    question: 'Tell me about a project you led.',
    keyword_beats: ['scope', 'team', 'outcome'],
    scripted_answer: 'I led the migration\nend to end.',
  },
]

const SCORE_BODY = {
  completeness: 90,
  accuracy: 80,
  fluency: 70,
  phoneme_quality: 60,
  flagged_words: [
    {
      word: 'migration',
      start: 1.0,
      end: 1.4,
      phoneme: 'ɡ',
      explanation: 'The /ɡ/ sound scored low.',
    },
  ],
  transcript: 'I led the migration end to end',
  cv: {
    posture: { stability: 0.88, gesture_ratio: 0.25, shoulder_tilt_deg: 6.0 },
    eye_contact: { looking_pct: 82.0 },
  },
}

beforeEach(() => {
  server.use(http.get(QUESTIONS_URL, () => HttpResponse.json(QUESTIONS)))
})

async function selectQuestion(): Promise<void> {
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('combobox', { name: 'Interview question' }),
  )
  await user.click(
    await screen.findByRole('option', {
      name: 'Tell me about a project you led.',
    }),
  )
}

async function score(): Promise<void> {
  const user = userEvent.setup()
  await selectQuestion()
  await user.click(await screen.findByRole('button', { name: 'Score' }))
}

describe('Interview', () => {
  it('should render the question list and collapse the scripted answer wrap', async () => {
    renderWithProviders(<Interview />)

    await selectQuestion()

    expect(
      screen.getByText('I led the migration end to end.'),
    ).toBeInTheDocument()
    expect(screen.getByText('scope')).toBeInTheDocument()
  })

  it('should post the video, scripted answer, and question when scoring', async () => {
    const appended: Array<[string, unknown]> = []
    const appendSpy = vi
      .spyOn(FormData.prototype, 'append')
      .mockImplementation(function (
        this: FormData,
        name: string,
        value: FormDataEntryValue,
        filename?: string,
      ) {
        appended.push([name, filename ?? value])
      } as typeof FormData.prototype.append)
    let scored = false
    server.use(
      http.post(SCORE_URL, () => {
        scored = true
        return HttpResponse.json(SCORE_BODY)
      }),
    )
    renderWithProviders(<Interview />)

    await score()

    await waitFor(() => expect(scored).toBe(true))
    expect(appended).toContainEqual([
      'scripted_answer',
      'I led the migration end to end.',
    ])
    expect(appended).toContainEqual([
      'question',
      'Tell me about a project you led.',
    ])
    expect(appended).toContainEqual(['video', 'answer.webm'])
    appendSpy.mockRestore()
  })

  it('should show the pronunciation and delivery sections from a scored response', async () => {
    server.use(http.post(SCORE_URL, () => HttpResponse.json(SCORE_BODY)))
    renderWithProviders(<Interview />)

    await score()

    await waitFor(() =>
      expect(screen.getByText('Delivery')).toBeInTheDocument(),
    )
    expect(screen.getByText('Pronunciation')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('migration')).toBeInTheDocument()
    expect(
      screen.getByText('I led the migration end to end'),
    ).toBeInTheDocument()
  })

  it('should hide the delivery section when the response has no cv report', async () => {
    server.use(
      http.post(SCORE_URL, () =>
        HttpResponse.json({ ...SCORE_BODY, cv: null }),
      ),
    )
    renderWithProviders(<Interview />)

    await score()

    await waitFor(() =>
      expect(screen.getByText('Pronunciation')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Delivery')).not.toBeInTheDocument()
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
    renderWithProviders(<Interview />)

    await score()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/too short or quiet/),
    )
  })

  it('should show an empty state when no questions are configured', async () => {
    server.use(http.get(QUESTIONS_URL, () => HttpResponse.json([])))
    renderWithProviders(<Interview />)

    await waitFor(() =>
      expect(
        screen.getByText(/No interview questions are configured/),
      ).toBeInTheDocument(),
    )
  })
})
