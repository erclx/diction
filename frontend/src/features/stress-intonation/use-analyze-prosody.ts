import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'

import { BACKEND_URL } from '@/config'
import { ClipTooWeakSchema } from '@/features/passage-scoring/score-result'
import { ClipTooWeakError } from '@/features/passage-scoring/use-score-passage'
import { useVoice } from '@/features/voice/use-voice'

export const StressMarkSchema = z.object({
  word: z.string(),
  syllables: z.array(z.string()),
  stress_index: z.number(),
})

export const ProsodyAnalysisSchema = z.object({
  rhythm_match: z.number(),
  intonation_match: z.number(),
  reference_contour: z.array(z.number()),
  learner_contour: z.array(z.number()),
  reference_timings: z.array(z.tuple([z.number(), z.number()])),
  stress_marks: z.array(StressMarkSchema),
})

export type StressMark = z.infer<typeof StressMarkSchema>
export type ProsodyAnalysis = z.infer<typeof ProsodyAnalysisSchema>

export interface AnalyzeProsodyInput {
  referenceText: string
  audio: Blob
}

const ANALYZE_TIMEOUT_MS = 60_000

async function analyzeProsody(
  { referenceText, audio }: AnalyzeProsodyInput,
  voice: string | null,
): Promise<ProsodyAnalysis> {
  const form = new FormData()
  form.append('reference_text', referenceText)
  form.append('audio', audio, 'recording.webm')
  if (voice) {
    form.append('voice', voice)
  }

  const response = await fetch(`${BACKEND_URL}/api/prosody/analyze`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
  })

  if (response.status === 422) {
    const parsed = ClipTooWeakSchema.safeParse(await response.json())
    throw new ClipTooWeakError(
      parsed.success ? parsed.data.detail : 'Clip too short or quiet to score',
    )
  }

  if (!response.ok) {
    throw new Error(`Analysis failed with status ${response.status}`)
  }

  return ProsodyAnalysisSchema.parse(await response.json())
}

export function useAnalyzeProsody() {
  const { voice } = useVoice()
  return useMutation({
    mutationFn: (input: AnalyzeProsodyInput) => analyzeProsody(input, voice),
  })
}
