import { Pause, Play } from 'lucide-react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useAudioChannel } from './audio-channel'
import { formatTime } from './format-time'

interface OwnRecordingAudioProps {
  src: string
  className?: string
}

export function OwnRecordingAudio({ src, className }: OwnRecordingAudioProps) {
  const channel = useAudioChannel()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.pause()
    }
  }, [])

  const handlePlay = useCallback(() => {
    channel.claim(stop)
    setIsPlaying(true)
  }, [channel, stop])

  const handleStop = useCallback(() => {
    channel.release(stop)
    setIsPlaying(false)
  }, [channel, stop])

  const resolveDuration = useCallback(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    if (Number.isFinite(audio.duration)) {
      setDuration(audio.duration)
      return
    }
    const onSeeked = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
      audio.currentTime = 0
      audio.removeEventListener('timeupdate', onSeeked)
    }
    audio.addEventListener('timeupdate', onSeeked)
    audio.currentTime = Number.MAX_SAFE_INTEGER
  }, [])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    channel.release(stop)
    return () => channel.release(stop)
  }, [src, channel, stop])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    if (audio.paused) {
      void audio.play()
    } else {
      audio.pause()
    }
  }, [])

  const seekToPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || !Number.isFinite(duration) || duration <= 0) {
        return
      }
      const bounds = event.currentTarget.getBoundingClientRect()
      const ratio = (event.clientX - bounds.left) / bounds.width
      audio.currentTime = Math.min(duration, Math.max(0, ratio * duration))
    },
    [duration],
  )

  const seekByKey = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || duration <= 0) {
        return
      }
      if (event.key === 'ArrowRight') {
        audio.currentTime = Math.min(duration, audio.currentTime + 1)
      } else if (event.key === 'ArrowLeft') {
        audio.currentTime = Math.max(0, audio.currentTime - 1)
      }
    },
    [duration],
  )

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-full border bg-card px-3 py-2',
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        onPlay={handlePlay}
        onPause={handleStop}
        onEnded={handleStop}
        onLoadedMetadata={resolveDuration}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-primary"
        aria-label={isPlaying ? 'Pause your recording' : 'Play your recording'}
        onClick={togglePlay}
      >
        {isPlaying ? <Pause /> : <Play />}
      </Button>
      <div
        role="slider"
        aria-label="Seek your recording"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        onPointerDown={seekToPointer}
        onKeyDown={seekByKey}
        className="relative h-1.5 grow cursor-pointer rounded-full bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  )
}
