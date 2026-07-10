import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AudioChannelProvider,
  useAudioChannel,
} from '@/features/audio-channel/audio-channel'

import { useRecorder } from './use-recorder'

function useRecorderHarness() {
  const channel = useAudioChannel()
  const recorder = useRecorder()
  return { channel, recorder }
}

describe('useRecorder', () => {
  beforeEach(() => {
    const stream = { getTracks: () => [] } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    })
    vi.stubGlobal(
      'MediaRecorder',
      class {
        ondataavailable: unknown = null
        onstop: unknown = null
        start() {}
        stop() {}
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should stop the active audio player when recording starts', async () => {
    const { result } = renderHook(() => useRecorderHarness(), {
      wrapper: AudioChannelProvider,
    })
    const stopActivePlayer = vi.fn()
    act(() => result.current.channel.claim(stopActivePlayer))

    await act(async () => {
      await result.current.recorder.start()
    })

    expect(stopActivePlayer).toHaveBeenCalledTimes(1)
  })
})
