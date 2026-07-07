import { useCallback, useRef } from 'react'

import { useAudioChannel } from './audio-channel'

interface OwnRecordingAudioProps {
  src: string
  className?: string
}

export function OwnRecordingAudio({ src, className }: OwnRecordingAudioProps) {
  const channel = useAudioChannel()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.pause()
    }
  }, [])

  const handlePlay = useCallback(() => channel.claim(stop), [channel, stop])
  const handleStop = useCallback(() => channel.release(stop), [channel, stop])

  return (
    <audio
      ref={audioRef}
      controls
      src={src}
      className={className}
      onPlay={handlePlay}
      onPause={handleStop}
      onEnded={handleStop}
    />
  )
}
