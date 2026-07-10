import { useMutation } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'

import { GeneratedContentSchema } from './generated-content'

export interface GeneratePassageInput {
  focusPhonemes: readonly string[]
}

const GENERATE_TIMEOUT_MS = 30_000

async function generatePassage({
  focusPhonemes,
}: GeneratePassageInput): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/api/content/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'passage', focus_phonemes: focusPhonemes }),
    signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Passage generation failed with status ${response.status}`)
  }

  return GeneratedContentSchema.parse(await response.json()).text
}

export function useGeneratePassage() {
  return useMutation({ mutationFn: generatePassage })
}
