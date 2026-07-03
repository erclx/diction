import { AudioLines, Loader2, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useReferenceAudio } from './use-reference-audio'

interface ReferenceButtonProps {
  text: string
  label: string
}

export function ReferenceButton({ text, label }: ReferenceButtonProps) {
  const reference = useReferenceAudio(text)

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={reference.isError ? `${label}, failed, retry` : label}
      title={reference.isError ? 'Reference audio failed, retry' : undefined}
      className={cn(reference.isError && 'text-destructive')}
      disabled={reference.isFetching}
      onClick={reference.play}
    >
      {reference.isFetching ? (
        <Loader2 className="animate-spin" />
      ) : reference.isError ? (
        <TriangleAlert />
      ) : (
        <AudioLines />
      )}
    </Button>
  )
}
