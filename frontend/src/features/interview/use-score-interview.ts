import { useMutation } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'
import { ClipTooWeakSchema } from '@/features/passage-scoring/score-result'
import { ClipTooWeakError } from '@/features/passage-scoring/use-score-passage'

import type { InterviewResult } from './interview-result'
import { InterviewResultSchema } from './interview-result'

export interface ScoreInterviewInput {
  scriptedAnswer: string
  question: string
  video: Blob
}

const SCORE_TIMEOUT_MS = 300_000

async function scoreInterview({
  scriptedAnswer,
  question,
  video,
}: ScoreInterviewInput): Promise<InterviewResult> {
  const form = new FormData()
  form.append('scripted_answer', scriptedAnswer)
  form.append('question', question)
  form.append('video', video, 'answer.webm')

  const response = await fetch(`${BACKEND_URL}/api/interview/score`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(SCORE_TIMEOUT_MS),
  })

  if (response.status === 422) {
    const parsed = ClipTooWeakSchema.safeParse(await response.json())
    throw new ClipTooWeakError(
      parsed.success ? parsed.data.detail : 'Clip too short or quiet to score',
    )
  }

  if (!response.ok) {
    throw new Error(`Scoring failed with status ${response.status}`)
  }

  return InterviewResultSchema.parse(await response.json())
}

export function useScoreInterview() {
  return useMutation({ mutationFn: scoreInterview })
}
