import { useEffect } from 'react'
import { AudioLines, Loader2, Square, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useReferenceAudio } from './use-reference-audio'

interface ReferenceButtonProps {
  text: string
  label: string
  disabled?: boolean
}

const STOP_LABEL = 'Stop playback'

export function ReferenceButton({
  text,
  label,
  disabled = false,
}: ReferenceButtonProps) {
  const reference = useReferenceAudio(text)

  const { isPlaying, stop } = reference
  useEffect(() => {
    if (disabled && isPlaying) {
      stop()
    }
  }, [disabled, isPlaying, stop])

  const handleClick = () => {
    if (reference.isPlaying) {
      reference.stop()
      return
    }
    reference.play()
  }

  const activeLabel = reference.isError
    ? `${label}, failed, retry`
    : reference.isPlaying
      ? STOP_LABEL
      : label

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={activeLabel}
      title={
        reference.isError
          ? 'Reference audio failed, retry'
          : reference.isPlaying
            ? STOP_LABEL
            : undefined
      }
      className={cn(
        reference.isError && 'text-destructive',
        reference.isPlaying && 'text-primary',
      )}
      disabled={disabled || reference.isFetching}
      onClick={handleClick}
    >
      {reference.isFetching ? (
        <Loader2 className="animate-spin" />
      ) : reference.isError ? (
        <TriangleAlert />
      ) : reference.isPlaying ? (
        <Square />
      ) : (
        <AudioLines />
      )}
    </Button>
  )
}
