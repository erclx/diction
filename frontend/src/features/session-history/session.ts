import { z } from 'zod'

import { FlaggedWordSchema } from '@/features/passage-scoring/score-result'

export const SessionListItemSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  mode: z.string(),
  accuracy: z.number(),
  phoneme_quality: z.number(),
})

export const SessionListSchema = z.array(SessionListItemSchema)

export const SessionDetailSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  mode: z.string(),
  passage: z.string().nullable(),
  completeness: z.number(),
  accuracy: z.number(),
  fluency: z.number(),
  phoneme_quality: z.number(),
  has_recording: z.boolean(),
  flagged_words: z.array(FlaggedWordSchema),
})

export type SessionListItem = z.infer<typeof SessionListItemSchema>
export type SessionDetail = z.infer<typeof SessionDetailSchema>
