import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'

import { BACKEND_URL } from '@/config'
import { ClipTooWeakSchema } from '@/features/passage-scoring/score-result'
import { ClipTooWeakError } from '@/features/passage-scoring/use-score-passage'

export const WordScoreSchema = z.object({
  phoneme_quality: z.number(),
  flagged_phonemes: z.array(z.string()),
})

export type WordScore = z.infer<typeof WordScoreSchema>

export interface ScoreWordInput {
  word: string
  audio: Blob
}

const SCORE_TIMEOUT_MS = 60_000

async function scoreWord({ word, audio }: ScoreWordInput): Promise<WordScore> {
  const form = new FormData()
  form.append('word', word)
  form.append('audio', audio, 'recording.webm')

  const response = await fetch(`${BACKEND_URL}/api/drills/minimal-pair/score`, {
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

  return WordScoreSchema.parse(await response.json())
}

export function useScoreWord() {
  return useMutation({ mutationFn: scoreWord })
}
