import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AudioChannelProvider, useAudioChannel } from './audio-channel'

function wrapper({ children }: { children: ReactNode }) {
  return <AudioChannelProvider>{children}</AudioChannelProvider>
}

describe('useAudioChannel', () => {
  it('should stop the previously claimed player when a second player claims', () => {
    const { result } = renderHook(() => useAudioChannel(), { wrapper })
    const stopFirst = vi.fn()
    const stopSecond = vi.fn()

    act(() => result.current.claim(stopFirst))
    act(() => result.current.claim(stopSecond))

    expect(stopFirst).toHaveBeenCalledTimes(1)
    expect(stopSecond).not.toHaveBeenCalled()
  })

  it('should not stop a player that already released before the next claim', () => {
    const { result } = renderHook(() => useAudioChannel(), { wrapper })
    const stopFirst = vi.fn()
    const stopSecond = vi.fn()

    act(() => result.current.claim(stopFirst))
    act(() => result.current.release(stopFirst))
    act(() => result.current.claim(stopSecond))

    expect(stopFirst).not.toHaveBeenCalled()
  })
})
