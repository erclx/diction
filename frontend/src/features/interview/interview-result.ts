import { z } from 'zod'

import { ScoreResultSchema } from '@/features/passage-scoring/score-result'

export const CvReportSchema = z.object({
  posture: z.object({
    stability: z.number(),
    gesture_ratio: z.number(),
    shoulder_tilt_deg: z.number(),
  }),
  eye_contact: z.object({
    looking_pct: z.number(),
  }),
})

export const InterviewResultSchema = ScoreResultSchema.extend({
  transcript: z.string(),
  cv: CvReportSchema.nullable(),
})

export type CvReport = z.infer<typeof CvReportSchema>
export type InterviewResult = z.infer<typeof InterviewResultSchema>
