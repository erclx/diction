import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ReferenceButton } from '@/features/reference-audio/reference-button'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { VoicePicker } from './voice-picker'

describe('VoicePicker', () => {
  beforeEach(() => {
    localStorage.clear()
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    window.HTMLMediaElement.prototype.play = vi
      .fn()
      .mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should list the available reference voices when opened', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePicker />)

    await user.click(
      await screen.findByRole('combobox', { name: 'Reference voice' }),
    )

    expect(
      await screen.findByRole('option', { name: 'Michael (Male)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Emma (Female)' }),
    ).toBeInTheDocument()
  })

  it('should send the picked voice on the next reference request', async () => {
    let requestedUrl = ''
    server.use(
      http.get('http://localhost:8000/api/reference', ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.arrayBuffer(
          new Uint8Array([82, 73, 70, 70]).buffer,
          { headers: { 'Content-Type': 'audio/wav' } },
        )
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <VoicePicker />
        <ReferenceButton text="thought" label="Hear thought" />
      </>,
    )

    await user.click(
      await screen.findByRole('combobox', { name: 'Reference voice' }),
    )
    await user.click(
      await screen.findByRole('option', { name: 'Michael (Male)' }),
    )
    await user.click(screen.getByRole('button', { name: 'Hear thought' }))

    await waitFor(() => expect(requestedUrl).toContain('voice=am_michael'))
  })
})
