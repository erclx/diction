import { describe, expect, it } from 'vitest'

import { validatePracticeText } from './practice-text'

describe('validatePracticeText', () => {
  it('should trim surrounding whitespace from a valid value', () => {
    const result = validatePracticeText('  Read this aloud.  ', 100)

    expect(result.value).toBe('Read this aloud.')
    expect(result.error).toBeNull()
  })

  it('should reject an empty value after trimming', () => {
    const result = validatePracticeText('   ', 100)

    expect(result.error).toBe('Enter some text to practice')
  })

  it('should reject a value with no letters', () => {
    const result = validatePracticeText('12345 !?', 100)

    expect(result.error).toBe('Enter words to practice')
  })

  it('should reject a value longer than the maximum length', () => {
    const result = validatePracticeText('a'.repeat(11), 10)

    expect(result.error).toBe('Keep it under 10 characters')
  })
})
