export const SHADOWING_PROMPTS = [
  'The early bird catches the worm.',
  'She sells seashells by the seashore.',
  'I would love to visit the museum this weekend.',
  'Could you please pass me the salt and pepper?',
  'The weather has been surprisingly warm lately.',
  'Practice makes perfect, so keep at it.',
] as const

export type ShadowingPrompt = (typeof SHADOWING_PROMPTS)[number]
