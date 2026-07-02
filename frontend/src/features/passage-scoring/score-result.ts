import { z } from 'zod'

export const FlaggedWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  phoneme: z.string(),
  explanation: z.string(),
})

export const ScoreResultSchema = z.object({
  completeness: z.number(),
  accuracy: z.number(),
  fluency: z.number(),
  phoneme_quality: z.number(),
  flagged_words: z.array(FlaggedWordSchema),
})

export const ClipTooWeakSchema = z.object({
  error: z.literal('clip_too_weak'),
  detail: z.string(),
})

export type FlaggedWord = z.infer<typeof FlaggedWordSchema>
export type ScoreResult = z.infer<typeof ScoreResultSchema>
export type ClipTooWeak = z.infer<typeof ClipTooWeakSchema>
