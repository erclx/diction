import { useCallback, useEffect, useRef, useState } from 'react'

import { useAudioChannel } from '@/features/audio-channel/audio-channel'

export type Span = readonly [number, number]

export interface SpanPlayer {
  playSpan: (start: number, end: number) => void
  canPlay: boolean
  activeSpan: Span | null
}

export const SPAN_PAD_SECONDS = 0.1

export function padSpan(
  start: number,
  end: number,
  clipDuration: number,
  pad = SPAN_PAD_SECONDS,
): { offset: number; duration: number } {
  const offset = Math.max(0, start - pad)
  const finish = Math.min(clipDuration, end + pad)
  return { offset, duration: Math.max(0, finish - offset) }
}

export function useSpanPlayer(url: string | undefined): SpanPlayer {
  const channel = useAudioChannel()
  const contextRef = useRef<AudioContext | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const [canPlay, setCanPlay] = useState(false)
  const [activeSpan, setActiveSpan] = useState<Span | null>(null)

  const stop = useCallback(() => {
    sourceRef.current?.stop()
  }, [])

  useEffect(() => {
    if (!url || typeof AudioContext === 'undefined') {
      return
    }

    const sourceUrl = url
    const context = new AudioContext()
    contextRef.current = context
    let cancelled = false

    async function decode(): Promise<void> {
      try {
        const response = await fetch(sourceUrl)
        const data = await response.arrayBuffer()
        const buffer = await context.decodeAudioData(data)
        if (cancelled) {
          return
        }
        bufferRef.current = buffer
        setCanPlay(true)
      } catch (error) {
        console.error('span player failed to decode the recording', error)
        setCanPlay(false)
      }
    }

    void decode()

    return () => {
      cancelled = true
      setCanPlay(false)
      sourceRef.current?.stop()
      sourceRef.current = null
      bufferRef.current = null
      setActiveSpan(null)
      channel.release(stop)
      void context.close()
      contextRef.current = null
    }
  }, [url, channel, stop])

  const playSpan = useCallback(
    (start: number, end: number) => {
      const context = contextRef.current
      const buffer = bufferRef.current
      if (!context || !buffer) {
        return
      }

      sourceRef.current?.stop()

      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      source.onended = () => {
        if (sourceRef.current === source) {
          sourceRef.current = null
          setActiveSpan(null)
          channel.release(stop)
        }
      }
      sourceRef.current = source

      channel.claim(stop)
      setActiveSpan([start, end])

      const { offset, duration } = padSpan(start, end, buffer.duration)
      const begin = () => source.start(0, offset, duration)
      if (context.state === 'suspended') {
        void context.resume().then(begin)
      } else {
        begin()
      }
    },
    [channel, stop],
  )

  return { playSpan, canPlay, activeSpan }
}
