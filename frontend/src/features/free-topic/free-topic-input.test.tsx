import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { FreeTopic } from './free-topic'

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

vi.mock('@/features/passage-scoring/use-recorder', () => ({
  useRecorder: () => recorderMock,
}))

describe('FreeTopic input', () => {
  it('should let the user type a custom topic before recording', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FreeTopic />)

    const input = screen.getByLabelText('Topic to speak about')
    await user.clear(input)
    await user.type(input, 'My weekend plans')

    expect(input).toHaveValue('My weekend plans')
    expect(screen.getByRole('button', { name: 'Record' })).toBeEnabled()
  })

  it('should replace the topic with a suggestion when shuffled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FreeTopic />)

    const input = screen.getByLabelText('Topic to speak about')
    const before = (input as HTMLTextAreaElement).value
    await user.click(screen.getByRole('button', { name: 'Shuffle' }))

    expect((input as HTMLTextAreaElement).value).not.toBe(before)
  })

  it('should block recording when the topic is emptied', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FreeTopic />)

    await user.clear(screen.getByLabelText('Topic to speak about'))

    expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled()
    expect(screen.getByText('Enter some text to practice')).toBeInTheDocument()
  })
})
