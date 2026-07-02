import { useMutation } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'

import type { ScoreResult } from './score-result'
import { ClipTooWeakSchema, ScoreResultSchema } from './score-result'

export interface ScorePassageInput {
  passage: string
  audio: Blob
}

const SCORE_TIMEOUT_MS = 60_000

export class ClipTooWeakError extends Error {
  readonly detail: string

  constructor(detail: string) {
    super('clip_too_weak')
    this.name = 'ClipTooWeakError'
    this.detail = detail
  }
}

async function scorePassage({
  passage,
  audio,
}: ScorePassageInput): Promise<ScoreResult> {
  const form = new FormData()
  form.append('passage', passage)
  form.append('audio', audio, 'recording.webm')

  const response = await fetch(`${BACKEND_URL}/api/passages/score`, {
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

  return ScoreResultSchema.parse(await response.json())
}

export function useScorePassage() {
  return useMutation({ mutationFn: scorePassage })
}
