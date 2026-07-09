export const FREE_TOPIC_PROMPTS = [
  'Describe a place you have traveled to and what made it memorable.',
  'Talk about a hobby you enjoy and how you first got started with it.',
  'Explain a recent decision you made and the reasoning behind it.',
  'Walk through your typical morning routine on a workday.',
  'Recommend a book, film, or show you liked and say why.',
  'Describe a skill you would like to learn and what draws you to it.',
] as const

export type FreeTopicPrompt = (typeof FREE_TOPIC_PROMPTS)[number]
