import { z } from 'zod'

export const WeakSoundSchema = z.object({
  phoneme: z.string(),
  occurrence_count: z.number(),
  word_count: z.number(),
  example_words: z.array(z.string()),
  first_seen: z.string(),
  last_seen: z.string(),
})

export const WeakSoundListSchema = z.array(WeakSoundSchema)

export type WeakSound = z.infer<typeof WeakSoundSchema>
