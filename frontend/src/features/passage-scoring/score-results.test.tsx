import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ScoreResult } from './score-result'
import { ScoreResults } from './score-results'

const baseResult: ScoreResult = {
  completeness: 90.9,
  accuracy: 92.2,
  fluency: 98,
  phoneme_quality: 94,
  flagged_words: [
    {
      word: 'thought',
      start: 6.19,
      end: 6.59,
      phoneme: 'θ',
      explanation: 'Say th, not t.',
    },
  ],
}

describe('ScoreResults', () => {
  it('should render a score metric with its label and value', () => {
    render(<ScoreResults result={baseResult} recordingUrl={undefined} />)

    expect(screen.getByText('Accuracy')).toBeInTheDocument()
    expect(screen.getByText('92.2')).toBeInTheDocument()
  })

  it('should list a flagged word with its explanation', () => {
    render(<ScoreResults result={baseResult} recordingUrl={undefined} />)

    expect(screen.getByText('thought')).toBeInTheDocument()
    expect(screen.getByText('Say th, not t.')).toBeInTheDocument()
  })

  it('should show an empty message when no words are flagged', () => {
    render(
      <ScoreResults
        result={{ ...baseResult, flagged_words: [] }}
        recordingUrl={undefined}
      />,
    )

    expect(screen.getByText(/No mispronounced words/)).toBeInTheDocument()
  })
})
