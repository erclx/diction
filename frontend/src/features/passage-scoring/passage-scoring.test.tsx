import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { PassageScoring } from './passage-scoring'

const { recorderMock } = vi.hoisted(() => ({
  recorderMock: {
    status: 'idle' as const,
    recording: null,
    level: 0,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  },
}))

vi.mock('./use-recorder', () => ({
  useRecorder: () => recorderMock,
}))

describe('PassageScoring', () => {
  it('should let the user edit the passage before recording', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PassageScoring />)

    const input = screen.getByLabelText('Passage to read')
    await user.clear(input)
    await user.type(input, 'A short custom line to read.')

    expect(input).toHaveValue('A short custom line to read.')
    expect(screen.getByRole('button', { name: 'Record' })).toBeEnabled()
  })

  it('should block recording when the passage is emptied', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PassageScoring />)

    const input = screen.getByLabelText('Passage to read')
    await user.clear(input)

    expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled()
    expect(screen.getByText('Enter some text to practice')).toBeInTheDocument()
  })

  it('should seed a generated passage into the editable field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PassageScoring />)

    await user.click(screen.getByRole('button', { name: 'Generate a passage' }))

    expect(await screen.findByDisplayValue(/freshly generated passage/)).toBe(
      screen.getByLabelText('Passage to read'),
    )
  })
})
