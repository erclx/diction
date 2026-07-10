import { z } from 'zod'

export const GeneratedContentSchema = z.object({
  text: z.string(),
})

export type GeneratedContent = z.infer<typeof GeneratedContentSchema>
