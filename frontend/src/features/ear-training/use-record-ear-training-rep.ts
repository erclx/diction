import { useMutation } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'

export interface EarTrainingRepInput {
  targetPhoneme: string
  correct: boolean
}

const REP_TIMEOUT_MS = 10_000

async function recordRep({
  targetPhoneme,
  correct,
}: EarTrainingRepInput): Promise<void> {
  const form = new FormData()
  form.append('target_phoneme', targetPhoneme)
  form.append('correct', String(correct))

  const response = await fetch(`${BACKEND_URL}/api/drills/ear-training/rep`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(REP_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Recording rep failed with status ${response.status}`)
  }
}

export function useRecordEarTrainingRep() {
  return useMutation({ mutationFn: recordRep })
}
