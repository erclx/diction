import { useEffect, useRef } from 'react'

interface CameraPreviewProps {
  stream: MediaStream
}

export function CameraPreview({ stream }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      aria-label="Camera preview"
      className="w-full max-w-md -scale-x-100 rounded-lg border bg-muted"
    />
  )
}
