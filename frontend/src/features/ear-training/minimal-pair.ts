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
