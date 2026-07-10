import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { ReferenceButton } from './reference-button'

interface PlayableMedia {
  isPaused: boolean
}

function DisablingHarness() {
  const [disabled, setDisabled] = useState(false)
  return (
    <>
      <button onClick={() => setDisabled(true)}>invalidate</button>
      <ReferenceButton
        text="thought"
        label="Hear thought"
        disabled={disabled}
      />
    </>
  )
}

describe('ReferenceButton', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get(this: PlayableMedia) {
        return this.isPaused ?? true
      },
    })
    window.HTMLMediaElement.prototype.play = vi.fn(function (
      this: HTMLMediaElement & PlayableMedia,
    ) {
      this.isPaused = false
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    })
    window.HTMLMediaElement.prototype.pause = vi.fn(function (
      this: HTMLMediaElement & PlayableMedia,
    ) {
      this.isPaused = true
      this.dispatchEvent(new Event('pause'))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function serveReference() {
    server.use(
      http.get('http://localhost:8000/api/reference', () =>
        HttpResponse.arrayBuffer(new Uint8Array([82, 73, 70, 70]).buffer, {
          headers: { 'Content-Type': 'audio/wav' },
        }),
      ),
    )
  }

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

  it('should render a stop label while playing', async () => {
    serveReference()
    const user = userEvent.setup()
    renderWithProviders(<ReferenceButton text="thought" label="Hear thought" />)

    await user.click(screen.getByRole('button', { name: 'Hear thought' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Stop playback' }),
      ).toBeInTheDocument(),
    )
  })

  it('should stop playback on a second click rather than replay', async () => {
    serveReference()
    const user = userEvent.setup()
    renderWithProviders(<ReferenceButton text="thought" label="Hear thought" />)

    await user.click(screen.getByRole('button', { name: 'Hear thought' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Stop playback' }),
      ).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Stop playback' }))

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('button', { name: 'Hear thought' }),
    ).toBeInTheDocument()
  })

  it('should stop playback when it becomes disabled mid-clip', async () => {
    serveReference()
    const user = userEvent.setup()
    renderWithProviders(<DisablingHarness />)

    await user.click(screen.getByRole('button', { name: 'Hear thought' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Stop playback' }),
      ).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'invalidate' }))

    await waitFor(() =>
      expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled(),
    )
    expect(screen.getByRole('button', { name: 'Hear thought' })).toBeDisabled()
  })
})
