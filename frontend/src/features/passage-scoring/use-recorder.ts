import { useCallback, useEffect, useRef, useState } from 'react'

import { computeRmsLevel, meterLevelFromRms } from './audio-level'

export type RecorderStatus = 'idle' | 'recording' | 'recorded' | 'denied'

export interface Recording {
  blob: Blob
  url: string
}

export interface Recorder {
  status: RecorderStatus
  recording: Recording | null
  level: number
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

export function useRecorder(): Recorder {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [recording, setRecording] = useState<Recording | null>(null)
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

  const startMeter = useCallback((stream: MediaStream) => {
    if (typeof AudioContext === 'undefined') {
      return
    }
    const context = new AudioContext()
    analyserContextRef.current = context
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    context.createMediaStreamSource(stream).connect(analyser)
    const samples = new Float32Array(analyser.fftSize)

    const sample = () => {
      analyser.getFloatTimeDomainData(samples)
      setLevel(meterLevelFromRms(computeRmsLevel(samples)))
      frameRef.current = requestAnimationFrame(sample)
    }
    frameRef.current = requestAnimationFrame(sample)
  }, [])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      streamRef.current = stream
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
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      recorder.start()
      recorderRef.current = recorder
      startMeter(stream)
      setStatus('recording')
    } catch {
      setStatus('denied')
    }
  }, [startMeter, teardownMeter])

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

  return { status, recording, level, start, stop, reset }
}
