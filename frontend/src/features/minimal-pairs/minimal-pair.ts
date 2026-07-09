import { z } from 'zod'

export const WordPairSchema = z.object({
  word_a: z.string(),
  word_b: z.string(),
})

export const MinimalPairContrastSchema = z.object({
  phoneme_a: z.string(),
  phoneme_b: z.string(),
  label: z.string(),
  pairs: z.array(WordPairSchema),
})

export const MinimalPairContrastListSchema = z.array(MinimalPairContrastSchema)

export type WordPair = z.infer<typeof WordPairSchema>
export type MinimalPairContrast = z.infer<typeof MinimalPairContrastSchema>

export function filterByPhoneme(
  contrasts: readonly MinimalPairContrast[],
  phoneme: string | null,
): MinimalPairContrast[] {
  if (phoneme === null || phoneme === '') {
    return [...contrasts]
  }
  return contrasts.filter(
    (contrast) =>
      contrast.phoneme_a === phoneme || contrast.phoneme_b === phoneme,
  )
}

export function contrastForPhoneme(
  contrasts: readonly MinimalPairContrast[],
  phoneme: string,
): MinimalPairContrast | null {
  return (
    contrasts.find(
      (contrast) =>
        contrast.phoneme_a === phoneme || contrast.phoneme_b === phoneme,
    ) ?? null
  )
}
