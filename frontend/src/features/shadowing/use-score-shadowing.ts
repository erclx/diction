import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'

import { BACKEND_URL } from '@/config'

export const ShadowingScoreSchema = z.object({
  rhythm_match: z.number(),
  intonation_match: z.number(),
})

export type ShadowingScore = z.infer<typeof ShadowingScoreSchema>

export interface ScoreShadowingInput {
  referenceText: string
  audio: Blob
}

const SCORE_TIMEOUT_MS = 60_000

async function scoreShadowing({
  referenceText,
  audio,
}: ScoreShadowingInput): Promise<ShadowingScore> {
  const form = new FormData()
  form.append('reference_text', referenceText)
  form.append('audio', audio, 'recording.webm')

  const response = await fetch(`${BACKEND_URL}/api/prosody/score`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(SCORE_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Scoring failed with status ${response.status}`)
  }

  return ShadowingScoreSchema.parse(await response.json())
}

export function useScoreShadowing() {
  return useMutation({ mutationFn: scoreShadowing })
}
