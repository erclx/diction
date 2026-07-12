import { useQuery } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'

import type { InterviewQuestion } from './interview-question'
import { InterviewQuestionsSchema } from './interview-question'

async function fetchInterviewQuestions(): Promise<InterviewQuestion[]> {
  const response = await fetch(`${BACKEND_URL}/api/interview/questions`)

  if (!response.ok) {
    throw new Error(`Failed to load questions with status ${response.status}`)
  }

  return InterviewQuestionsSchema.parse(await response.json())
}

export function useInterviewQuestions() {
  return useQuery({
    queryKey: ['interview-questions'],
    queryFn: fetchInterviewQuestions,
  })
}
