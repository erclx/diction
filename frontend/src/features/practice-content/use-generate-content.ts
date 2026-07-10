import { useMutation } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'

import { GeneratedContentSchema } from './generated-content'

export type ContentKind = 'passage' | 'shadowing' | 'stress'

export interface GenerateContentInput {
  kind: ContentKind
  focusPhonemes?: readonly string[]
}

const GENERATE_TIMEOUT_MS = 30_000

export async function generateContent({
  kind,
  focusPhonemes = [],
}: GenerateContentInput): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/api/content/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, focus_phonemes: focusPhonemes }),
    signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Content generation failed with status ${response.status}`)
  }

  return GeneratedContentSchema.parse(await response.json()).text
}

export function useGenerateContent() {
  return useMutation({ mutationFn: generateContent })
}
