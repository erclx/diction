import { AudioLines, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

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
      aria-label={label}
      disabled={reference.isFetching}
      onClick={reference.play}
    >
      {reference.isFetching ? (
        <Loader2 className="animate-spin" />
      ) : (
        <AudioLines />
      )}
    </Button>
  )
}
