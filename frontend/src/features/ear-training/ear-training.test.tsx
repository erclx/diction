import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { EarTraining } from './ear-training'

const CONTRASTS = [
  {
    phoneme_a: 'θ',
    phoneme_b: 'f',
    label: 'th vs f',
    pairs: [{ word_a: 'thin', word_b: 'fin' }],
  },
]

function serveContrasts(contrasts: unknown[]) {
  server.use(
    http.get('http://localhost:8000/api/minimal-pairs', () =>
      HttpResponse.json(contrasts),
    ),
  )
}

describe('EarTraining', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    window.HTMLMediaElement.prototype.play = vi
      .fn()
      .mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should mark a correct choice and count it toward the score', async () => {
    serveContrasts(CONTRASTS)
    const user = userEvent.setup()
    renderWithProviders(<EarTraining random={() => 0} />)

    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(await screen.findByRole('button', { name: 'thin' }))

    expect(screen.getByRole('status')).toHaveTextContent('Correct')
    expect(screen.getByText('1 of 1 correct')).toBeInTheDocument()
  })

  it('should mark a wrong choice and leave the score uncounted', async () => {
    serveContrasts(CONTRASTS)
    const user = userEvent.setup()
    renderWithProviders(<EarTraining random={() => 0} />)

    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(await screen.findByRole('button', { name: 'fin' }))

    expect(screen.getByRole('status')).toHaveTextContent('It was thin')
    expect(screen.getByText('0 of 1 correct')).toBeInTheDocument()
  })

  it('should record a rep with the target phoneme and verdict on answer', async () => {
    serveContrasts(CONTRASTS)
    const reps: Record<string, string>[] = []
    server.use(
      http.post(
        'http://localhost:8000/api/drills/ear-training/rep',
        async ({ request }) => {
          const form = await request.formData()
          reps.push({
            target_phoneme: String(form.get('target_phoneme')),
            correct: String(form.get('correct')),
          })
          return HttpResponse.json({ recorded: true })
        },
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<EarTraining random={() => 0} />)

    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(await screen.findByRole('button', { name: 'thin' }))

    await waitFor(() =>
      expect(reps).toEqual([{ target_phoneme: 'θ', correct: 'true' }]),
    )
  })

  it('should prompt to return to practice when no pairs exist', async () => {
    serveContrasts([])
    renderWithProviders(<EarTraining />)

    expect(
      await screen.findByText('No drill pairs are available yet.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Start' }),
    ).not.toBeInTheDocument()
  })
})
