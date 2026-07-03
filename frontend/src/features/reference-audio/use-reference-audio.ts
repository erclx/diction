import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BACKEND_URL } from '@/config'

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
}

export function useReferenceAudio(text: string): ReferenceAudio {
  const [shouldLoad, setShouldLoad] = useState(false)
  const wantsPlayRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const query = useQuery({
    queryKey: referenceAudioKey(text),
    queryFn: () => fetchReferenceAudio(text),
    enabled: shouldLoad && text.trim().length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const objectUrl = useMemo(
    () => (query.data ? URL.createObjectURL(query.data) : undefined),
    [query.data],
  )

  useEffect(() => {
    if (!objectUrl) {
      return
    }
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  const playUrl = useCallback((url: string) => {
    const audio = audioRef.current ?? new Audio()
    audioRef.current = audio
    audio.src = url
    audio.currentTime = 0
    void audio.play()
  }, [])

  useEffect(() => {
    if (objectUrl && wantsPlayRef.current) {
      wantsPlayRef.current = false
      playUrl(objectUrl)
    }
  }, [objectUrl, playUrl])

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

  return { play, isFetching: query.isFetching, isError: query.isError }
}
