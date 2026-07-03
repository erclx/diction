import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { ReferenceButton } from './reference-button'

describe('ReferenceButton', () => {
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

  it('should request native reference audio for its text when clicked', async () => {
    let requestedUrl = ''
    server.use(
      http.get('http://localhost:8000/api/reference', ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.arrayBuffer(
          new Uint8Array([82, 73, 70, 70]).buffer,
          {
            headers: { 'Content-Type': 'audio/wav' },
          },
        )
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<ReferenceButton text="thought" label="Hear thought" />)

    await user.click(screen.getByRole('button', { name: 'Hear thought' }))

    await waitFor(() => expect(requestedUrl).toContain('text=thought'))
  })

  it('should not request audio before it is clicked', () => {
    renderWithProviders(<ReferenceButton text="thought" label="Hear thought" />)

    expect(screen.getByRole('button', { name: 'Hear thought' })).toBeEnabled()
  })

  it('should surface a failed synthesis instead of failing silently', async () => {
    server.use(
      http.get('http://localhost:8000/api/reference', () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<ReferenceButton text="thought" label="Hear thought" />)

    await user.click(screen.getByRole('button', { name: 'Hear thought' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Hear thought, failed, retry' }),
      ).toBeInTheDocument(),
    )
  })
})
