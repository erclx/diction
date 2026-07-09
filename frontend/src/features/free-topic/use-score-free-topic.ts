import { useMutation } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'
import { ClipTooWeakSchema } from '@/features/passage-scoring/score-result'
import { ClipTooWeakError } from '@/features/passage-scoring/use-score-passage'

import type { FreeTopicResult } from './free-topic-result'
import { FreeTopicResultSchema } from './free-topic-result'

export interface ScoreFreeTopicInput {
  topic: string
  audio: Blob
}

const SCORE_TIMEOUT_MS = 60_000

async function scoreFreeTopic({
  topic,
  audio,
}: ScoreFreeTopicInput): Promise<FreeTopicResult> {
  const form = new FormData()
  form.append('topic', topic)
  form.append('audio', audio, 'recording.webm')

  const response = await fetch(`${BACKEND_URL}/api/free-topic/score`, {
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

  return FreeTopicResultSchema.parse(await response.json())
}

export function useScoreFreeTopic() {
  return useMutation({ mutationFn: scoreFreeTopic })
}
