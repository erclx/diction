import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AudioChannelProvider } from './audio-channel'
import { OwnRecordingAudio } from './own-recording-audio'

function renderPlayer() {
  return render(
    <AudioChannelProvider>
      <OwnRecordingAudio src="blob:mock" />
    </AudioChannelProvider>,
  )
}

describe('OwnRecordingAudio', () => {
  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = vi
      .fn()
      .mockResolvedValue(undefined)
    window.HTMLMediaElement.prototype.pause = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render a play control and a seek slider', () => {
    renderPlayer()

    expect(
      screen.getByRole('button', { name: 'Play your recording' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('slider', { name: 'Seek your recording' }),
    ).toBeInTheDocument()
  })

  it('should start playback when the play control is pressed', async () => {
    const user = userEvent.setup()
    renderPlayer()

    await user.click(
      screen.getByRole('button', { name: 'Play your recording' }),
    )

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
  })
})
