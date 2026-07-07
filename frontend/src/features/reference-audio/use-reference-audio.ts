import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { BACKEND_URL } from '@/config'
import { useAudioChannel } from '@/features/audio-channel/audio-channel'

const REFERENCE_TIMEOUT_MS = 30_000

export const referenceAudioKey = (text: string) =>
  ['reference-audio', text] as const

async function fetchReferenceAudio(text: string): Promise<Blob> {
  const url = new URL(`${BACKEND_URL}/api/reference`)
  url.searchParams.set('text', text)

  const response = await fetch(url, {
    signal: AbortSignal.timeout(REFERENCE_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Reference synthesis failed with status ${response.status}`)
  }

  return response.blob()
}

export interface ReferenceAudio {
  play: () => void
  isFetching: boolean
  isError: boolean
  isPlaying: boolean
}

export function useReferenceAudio(text: string): ReferenceAudio {
  const channel = useAudioChannel()
  const [shouldLoad, setShouldLoad] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const wantsPlayRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const query = useQuery({
    queryKey: referenceAudioKey(text),
    queryFn: () => fetchReferenceAudio(text),
    enabled: shouldLoad && text.trim().length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const [objectUrl, setObjectUrl] = useState<string>()

  useEffect(() => {
    if (!query.data) {
      setObjectUrl(undefined)
      return
    }
    const url = URL.createObjectURL(query.data)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [query.data])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.pause()
    }
  }, [])

  const ensureAudio = useCallback((): HTMLAudioElement => {
    const existing = audioRef.current
    if (existing) {
      return existing
    }
    const audio = new Audio()
    audioRef.current = audio
    audio.addEventListener('play', () => {
      channel.claim(stop)
      setIsPlaying(true)
    })
    audio.addEventListener('ended', () => {
      channel.release(stop)
      setIsPlaying(false)
    })
    audio.addEventListener('pause', () => setIsPlaying(false))
    return audio
  }, [channel, stop])

  const playUrl = useCallback(
    (url: string) => {
      const audio = ensureAudio()
      audio.src = url
      audio.currentTime = 0
      void audio.play()
    },
    [ensureAudio],
  )

  useEffect(() => {
    if (objectUrl && wantsPlayRef.current) {
      wantsPlayRef.current = false
      playUrl(objectUrl)
    }
  }, [objectUrl, playUrl])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      channel.release(stop)
    }
  }, [channel, stop])

  const play = useCallback(() => {
    if (objectUrl) {
      playUrl(objectUrl)
      return
    }
    wantsPlayRef.current = true
    if (query.isError) {
      void query.refetch()
      return
    }
    setShouldLoad(true)
  }, [objectUrl, playUrl, query])

  return {
    play,
    isFetching: query.isFetching,
    isError: query.isError,
    isPlaying,
  }
}
