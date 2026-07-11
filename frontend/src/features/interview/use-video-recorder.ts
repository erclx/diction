import { useCallback, useEffect, useRef, useState } from 'react'

import { useAudioChannel } from '@/features/audio-channel/audio-channel'
import {
  computeRmsLevel,
  meterLevelFromRms,
} from '@/features/passage-scoring/audio-level'

export type VideoRecorderStatus = 'idle' | 'recording' | 'recorded' | 'denied'

export interface VideoRecording {
  blob: Blob
  url: string
}

export interface VideoRecorder {
  status: VideoRecorderStatus
  recording: VideoRecording | null
  stream: MediaStream | null
  level: number
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

export function useVideoRecorder(): VideoRecorder {
  const channel = useAudioChannel()
  const [status, setStatus] = useState<VideoRecorderStatus>('idle')
  const [recording, setRecording] = useState<VideoRecording | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [level, setLevel] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserContextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef<number | null>(null)

  const teardownMeter = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    void analyserContextRef.current?.close()
    analyserContextRef.current = null
    setLevel(0)
  }, [])

  const startMeter = useCallback((source: MediaStream) => {
    if (typeof AudioContext === 'undefined') {
      return
    }
    const context = new AudioContext()
    analyserContextRef.current = context
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    context.createMediaStreamSource(source).connect(analyser)
    const samples = new Float32Array(analyser.fftSize)

    const sample = () => {
      analyser.getFloatTimeDomainData(samples)
      setLevel(meterLevelFromRms(computeRmsLevel(samples)))
      frameRef.current = requestAnimationFrame(sample)
    }
    frameRef.current = requestAnimationFrame(sample)
  }, [])

  const start = useCallback(async () => {
    channel.stop()
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      const recorder = new MediaRecorder(media)
      streamRef.current = media
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        setRecording({ blob, url: URL.createObjectURL(blob) })
        setStatus('recorded')
        teardownMeter()
        media.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setStream(null)
      }

      recorder.start()
      recorderRef.current = recorder
      setStream(media)
      startMeter(media)
      setStatus('recording')
    } catch {
      setStatus('denied')
    }
  }, [channel, startMeter, teardownMeter])

  const stop = useCallback(() => {
    recorderRef.current?.stop()
    recorderRef.current = null
  }, [])

  const reset = useCallback(() => {
    setRecording(null)
    setStatus('idle')
  }, [])

  useEffect(() => {
    if (!recording) {
      return
    }
    return () => URL.revokeObjectURL(recording.url)
  }, [recording])

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder) {
        recorder.onstop = null
        if (recorder.state !== 'inactive') {
          recorder.stop()
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      teardownMeter()
    }
  }, [teardownMeter])

  return { status, recording, stream, level, start, stop, reset }
}
