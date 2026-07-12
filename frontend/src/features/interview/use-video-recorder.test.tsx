import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AudioChannelProvider,
  useAudioChannel,
} from '@/features/audio-channel/audio-channel'

import { useVideoRecorder } from './use-video-recorder'

function useVideoRecorderHarness() {
  const channel = useAudioChannel()
  const recorder = useVideoRecorder()
  return { channel, recorder }
}

describe('useVideoRecorder', () => {
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

  it('should request video and audio when recording starts', async () => {
    const { result } = renderHook(() => useVideoRecorderHarness(), {
      wrapper: AudioChannelProvider,
    })

    await act(async () => {
      await result.current.recorder.start()
    })

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: true,
      audio: true,
    })
  })

  it('should stop the active audio player when recording starts', async () => {
    const { result } = renderHook(() => useVideoRecorderHarness(), {
      wrapper: AudioChannelProvider,
    })
    const stopActivePlayer = vi.fn()
    act(() => result.current.channel.claim(stopActivePlayer))

    await act(async () => {
      await result.current.recorder.start()
    })

    expect(stopActivePlayer).toHaveBeenCalledTimes(1)
  })

  it('should enter the denied state when camera access is refused', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const { result } = renderHook(() => useVideoRecorderHarness(), {
      wrapper: AudioChannelProvider,
    })

    await act(async () => {
      await result.current.recorder.start()
    })

    expect(result.current.recorder.status).toBe('denied')
  })
})
