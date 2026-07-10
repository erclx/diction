export const PASSAGE_MAX_LENGTH = 500
export const TOPIC_MAX_LENGTH = 300

export interface PracticeTextValidation {
  value: string
  error: string | null
}

export function validatePracticeText(
  raw: string,
  maxLength: number,
): PracticeTextValidation {
  const value = raw.trim()

  if (value.length === 0) {
    return { value, error: 'Enter some text to practice' }
  }

  if (!/\p{L}/u.test(value)) {
    return { value, error: 'Enter words to practice' }
  }

  if (value.length > maxLength) {
    return { value, error: `Keep it under ${maxLength} characters` }
  }

  return { value, error: null }
}
