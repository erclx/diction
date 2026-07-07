import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { TargetedDrills } from './targeted-drills'

const CONTRASTS = [
  {
    phoneme_a: 'θ',
    phoneme_b: 'f',
    label: 'th vs f',
    pairs: [{ word_a: 'thin', word_b: 'fin' }],
  },
  {
    phoneme_a: 'ɹ',
    phoneme_b: 'l',
    label: 'r vs l',
    pairs: [{ word_a: 'road', word_b: 'load' }],
  },
]

function weakSound(
  phoneme: string,
  occurrenceCount: number,
  exampleWords: string[] = [],
) {
  return {
    phoneme,
    occurrence_count: occurrenceCount,
    word_count: exampleWords.length,
    example_words: exampleWords,
    first_seen: '2026-06-28T07:41:00Z',
    last_seen: '2026-07-02T09:14:00Z',
  }
}

function dueSound(
  phoneme: string,
  isDue: boolean,
  exampleWords: string[] = [],
) {
  return {
    phoneme,
    box: 0,
    interval_days: 1,
    last_practiced: '2026-07-01T09:14:00Z',
    next_due: '2026-07-02T09:14:00Z',
    is_due: isDue,
    example_words: exampleWords,
  }
}

function serve(
  weakSounds: unknown[],
  { dueSounds = [], contrasts = CONTRASTS }: ServeOptions = {},
) {
  server.use(
    http.get('http://localhost:8000/api/resurfacing', () =>
      HttpResponse.json(dueSounds),
    ),
    http.get('http://localhost:8000/api/weak-sounds', () =>
      HttpResponse.json(weakSounds),
    ),
    http.get('http://localhost:8000/api/minimal-pairs', () =>
      HttpResponse.json(contrasts),
    ),
  )
}

interface ServeOptions {
  dueSounds?: unknown[]
  contrasts?: unknown[]
}

describe('TargetedDrills', () => {
  it('should keep the ranked queue order and link the top sound to its drill', async () => {
    serve([weakSound('θ', 8, ['thought']), weakSound('ɹ', 5, ['red'])])
    renderWithProviders(<TargetedDrills />)

    const higher = await screen.findByText('th vs f')
    const lower = screen.getByText('r vs l')
    expect(
      higher.compareDocumentPosition(lower) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const earLinks = screen.getAllByRole('link', { name: 'Ear training' })
    expect(earLinks[0]).toHaveAttribute(
      'href',
      `/drills/ear-training?phoneme=${encodeURIComponent('θ')}`,
    )
    const productionLinks = screen.getAllByRole('link', { name: 'Production' })
    expect(productionLinks[0]).toHaveAttribute(
      'href',
      `/drills/production?phoneme=${encodeURIComponent('θ')}`,
    )
  })

  it('should lead with the due-for-review sounds over the weak-sound ranking', async () => {
    serve([weakSound('θ', 8, ['thought'])], {
      dueSounds: [dueSound('ɹ', true, ['red'])],
    })
    renderWithProviders(<TargetedDrills />)

    expect(await screen.findByText('r vs l')).toBeInTheDocument()
    expect(screen.getByText('Due')).toBeInTheDocument()
    expect(screen.queryByText('th vs f')).not.toBeInTheDocument()
  })

  it('should fall back to the weak-sound ranking when nothing is due', async () => {
    serve([weakSound('θ', 8, ['thought'])], {
      dueSounds: [dueSound('ɹ', false, ['red'])],
    })
    renderWithProviders(<TargetedDrills />)

    expect(await screen.findByText('th vs f')).toBeInTheDocument()
    expect(screen.getByText('8x')).toBeInTheDocument()
    expect(screen.queryByText('r vs l')).not.toBeInTheDocument()
  })

  it('should still show the weak-sound ranking when resurfacing fails', async () => {
    serve([weakSound('θ', 8, ['thought'])])
    server.use(
      http.get('http://localhost:8000/api/resurfacing', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    renderWithProviders(<TargetedDrills />)

    expect(await screen.findByText('th vs f')).toBeInTheDocument()
    expect(screen.getByText('8x')).toBeInTheDocument()
    expect(
      screen.queryByRole('alert', { name: /Could not load/ }),
    ).not.toBeInTheDocument()
  })

  it('should show an onboarding prompt when no weak sounds exist', async () => {
    serve([])
    renderWithProviders(<TargetedDrills />)

    expect(await screen.findByText(/No weak sounds yet/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Read a passage' }),
    ).toHaveAttribute('href', '/')
  })

  it('should show a note for a weak sound with no matching contrast', async () => {
    serve([weakSound('ʒ', 4, ['measure'])])
    renderWithProviders(<TargetedDrills />)

    expect(
      await screen.findByText(/No drill for this sound yet/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Ear training' }),
    ).not.toBeInTheDocument()
  })
})
