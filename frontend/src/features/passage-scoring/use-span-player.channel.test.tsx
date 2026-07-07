import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AudioChannelProvider,
  useAudioChannel,
} from '@/features/audio-channel/audio-channel'

import { useSpanPlayer } from './use-span-player'

class FakeSource {
  buffer: unknown = null
  onended: (() => void) | null = null
  started = false
  connect = vi.fn()
  start = vi.fn(() => {
    this.started = true
  })
  stop = vi.fn(() => {
    if (!this.started) {
      throw new DOMException('cannot stop before start', 'InvalidStateError')
    }
  })
}

const sources: FakeSource[] = []

class FakeAudioContext {
  state = 'suspended'
  destination = {}
  createBufferSource() {
    const source = new FakeSource()
    sources.push(source)
    return source
  }
  decodeAudioData = vi.fn().mockResolvedValue({ duration: 5 })
  resume = vi.fn(() => new Promise<void>(() => {}))
  close = vi.fn().mockResolvedValue(undefined)
}

function wrapper({ children }: { children: ReactNode }) {
  return <AudioChannelProvider>{children}</AudioChannelProvider>
}

describe('useSpanPlayer channel coordination', () => {
  beforeEach(() => {
    sources.length = 0
    vi.stubGlobal('AudioContext', FakeAudioContext)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should not stop a span source that has not started when another player claims', async () => {
    const { result } = renderHook(
      () => ({
        player: useSpanPlayer('blob:recording'),
        channel: useAudioChannel(),
      }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.player.canPlay).toBe(true))

    act(() => result.current.player.playSpan(0, 1))
    expect(sources).toHaveLength(1)
    expect(sources[0].started).toBe(false)

    act(() => result.current.channel.claim(vi.fn()))

    expect(sources[0].stop).not.toHaveBeenCalled()
    expect(result.current.player.activeSpan).toBeNull()
  })
})
