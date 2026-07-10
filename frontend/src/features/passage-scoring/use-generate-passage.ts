import { useMutation } from '@tanstack/react-query'

import { generateContent } from '@/features/practice-content/use-generate-content'

export interface GeneratePassageInput {
  focusPhonemes: readonly string[]
}

export function useGeneratePassage() {
  return useMutation({
    mutationFn: ({ focusPhonemes }: GeneratePassageInput) =>
      generateContent({ kind: 'passage', focusPhonemes }),
  })
}
