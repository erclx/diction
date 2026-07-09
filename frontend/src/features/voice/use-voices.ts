import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { BACKEND_URL } from '@/config'

export const VoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  accent: z.string(),
  gender: z.string(),
})

export const VoicesSchema = z.object({
  voices: z.array(VoiceSchema),
  default: z.string(),
})

export type Voice = z.infer<typeof VoiceSchema>
export type Voices = z.infer<typeof VoicesSchema>

async function fetchVoices(): Promise<Voices> {
  const response = await fetch(`${BACKEND_URL}/api/voices`)

  if (!response.ok) {
    throw new Error(`Voices fetch failed with status ${response.status}`)
  }

  return VoicesSchema.parse(await response.json())
}

export function useVoices() {
  return useQuery({
    queryKey: ['voices'],
    queryFn: fetchVoices,
    staleTime: Infinity,
  })
}
