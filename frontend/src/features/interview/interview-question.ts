import { z } from 'zod'

export const InterviewQuestionSchema = z.object({
  category: z.string(),
  question: z.string(),
  keyword_beats: z.array(z.string()),
  scripted_answer: z.string(),
})

export const InterviewQuestionsSchema = z.array(InterviewQuestionSchema)

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>

export function collapseLineBreaks(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
