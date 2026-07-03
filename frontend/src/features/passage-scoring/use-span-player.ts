import { useCallback, useEffect, useRef, useState } from 'react'

export interface SpanPlayer {
  playSpan: (start: number, end: number) => void
  canPlay: boolean
}

export function useSpanPlayer(url: string | undefined): SpanPlayer {
  const contextRef = useRef<AudioContext | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const [canPlay, setCanPlay] = useState(false)

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
      } catch {
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
      void context.close()
      contextRef.current = null
    }
  }, [url])

  const playSpan = useCallback((start: number, end: number) => {
    const context = contextRef.current
    const buffer = bufferRef.current
    if (!context || !buffer) {
      return
    }

    sourceRef.current?.stop()

    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    sourceRef.current = source

    void context.resume()
    source.start(0, start, Math.max(0, end - start))
  }, [])

  return { playSpan, canPlay }
}
