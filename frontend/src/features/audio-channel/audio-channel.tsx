import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'

type StopPlayback = () => void

interface AudioChannel {
  claim: (stop: StopPlayback) => void
  release: (stop: StopPlayback) => void
}

const AudioChannelContext = createContext<AudioChannel | null>(null)

interface AudioChannelProviderProps {
  children: ReactNode
}

export function AudioChannelProvider({ children }: AudioChannelProviderProps) {
  const activeStopRef = useRef<StopPlayback | null>(null)

  const claim = useCallback((stop: StopPlayback) => {
    const current = activeStopRef.current
    if (current && current !== stop) {
      current()
    }
    activeStopRef.current = stop
  }, [])

  const release = useCallback((stop: StopPlayback) => {
    if (activeStopRef.current === stop) {
      activeStopRef.current = null
    }
  }, [])

  const channel = useMemo(() => ({ claim, release }), [claim, release])

  return (
    <AudioChannelContext.Provider value={channel}>
      {children}
    </AudioChannelContext.Provider>
  )
}

export function useAudioChannel(): AudioChannel {
  const channel = useContext(AudioChannelContext)
  if (!channel) {
    throw new Error(
      'useAudioChannel must be used within an AudioChannelProvider',
    )
  }
  return channel
}
