import { z } from 'zod'

import { ScoreResultSchema } from '@/features/passage-scoring/score-result'

export const FreeTopicResultSchema = ScoreResultSchema.extend({
  transcript: z.string(),
  critique: z.array(z.string()),
})

export type FreeTopicResult = z.infer<typeof FreeTopicResultSchema>
