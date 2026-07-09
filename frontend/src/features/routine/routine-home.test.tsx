import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { RoutineHome } from './routine-home'

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

function weakSound(phoneme: string) {
  return {
    phoneme,
    occurrence_count: 4,
    word_count: 1,
    example_words: [],
    first_seen: '2026-06-28T07:41:00Z',
    last_seen: '2026-07-02T09:14:00Z',
  }
}

function dueSound(phoneme: string, isDue: boolean) {
  return {
    phoneme,
    box: 0,
    interval_days: 1,
    last_practiced: '2026-07-01T09:14:00Z',
    next_due: '2026-07-02T09:14:00Z',
    is_due: isDue,
    example_words: [],
  }
}

interface ServeOptions {
  dueSounds?: unknown[]
  weakSounds?: unknown[]
  contrasts?: unknown[]
}

function serve({
  dueSounds = [],
  weakSounds = [],
  contrasts = CONTRASTS,
}: ServeOptions = {}) {
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

describe('RoutineHome', () => {
  it('should show a loading state before the signals resolve', () => {
    serve({ dueSounds: [dueSound('ɹ', true)] })
    renderWithProviders(<RoutineHome />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading routine')
  })

  it('should lead with a due sound and link its drill with the phoneme param', async () => {
    serve({ dueSounds: [dueSound('ɹ', true)] })
    renderWithProviders(<RoutineHome />)

    expect(await screen.findByText('Due for review')).toBeInTheDocument()
    const startLinks = screen.getAllByRole('link', { name: 'Start' })
    expect(startLinks[0]).toHaveAttribute(
      'href',
      `/drills/production?phoneme=${encodeURIComponent('ɹ')}`,
    )
  })

  it('should give a fixed starter rotation on a cold start', async () => {
    serve()
    renderWithProviders(<RoutineHome />)

    expect(await screen.findByText('Passage')).toBeInTheDocument()
    expect(screen.getByText('Shadowing')).toBeInTheDocument()
    expect(screen.getByText('Stress')).toBeInTheDocument()
  })

  it('should still build the weak-sound routine when resurfacing fails', async () => {
    serve({ weakSounds: [weakSound('θ')] })
    server.use(
      http.get('http://localhost:8000/api/resurfacing', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    renderWithProviders(<RoutineHome />)

    expect(await screen.findByText('Weak sound')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
