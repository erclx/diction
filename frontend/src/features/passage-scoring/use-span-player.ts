import { useCallback, useEffect, useRef } from 'react'

export interface SpanPlayer {
  playSpan: (start: number, end: number) => void
  canPlay: boolean
}

export function useSpanPlayer(url: string | undefined): SpanPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopAtRef = useRef(0)

  useEffect(() => {
    if (!url) {
      return
    }

    const audio = new Audio(url)
    audioRef.current = audio

    const stopAtEnd = () => {
      if (audio.currentTime >= stopAtRef.current) {
        audio.pause()
      }
    }
    audio.addEventListener('timeupdate', stopAtEnd)

    return () => {
      audio.removeEventListener('timeupdate', stopAtEnd)
      audio.pause()
      audioRef.current = null
    }
  }, [url])

  const playSpan = useCallback((start: number, end: number) => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    stopAtRef.current = end
    audio.currentTime = start
    void audio.play()
  }, [])

  return { playSpan, canPlay: Boolean(url) }
}
