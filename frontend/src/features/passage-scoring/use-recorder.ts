import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderStatus = 'idle' | 'recording' | 'recorded' | 'denied'

export interface Recording {
  blob: Blob
  url: string
}

export interface Recorder {
  status: RecorderStatus
  recording: Recording | null
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

export function useRecorder(): Recorder {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [recording, setRecording] = useState<Recording | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

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
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
    } catch {
      setStatus('denied')
    }
  }, [])

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
    }
  }, [])

  return { status, recording, start, stop, reset }
}
