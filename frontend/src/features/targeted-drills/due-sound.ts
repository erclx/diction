import { z } from 'zod'

export const DueSoundSchema = z.object({
  phoneme: z.string(),
  box: z.number(),
  interval_days: z.number(),
  last_practiced: z.string(),
  next_due: z.string(),
  is_due: z.boolean(),
  example_words: z.array(z.string()),
})

export const DueSoundListSchema = z.array(DueSoundSchema)

export type DueSound = z.infer<typeof DueSoundSchema>
