import { Volume2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ReferenceButton } from '@/features/reference-audio/reference-button'
import { cn } from '@/lib/utils'

import type { FlaggedWord } from './score-result'
import type { SpanPlayer } from './use-span-player'

interface FlaggedWordListProps {
  words: readonly FlaggedWord[]
  player?: SpanPlayer
}

export function FlaggedWordList({ words, player }: FlaggedWordListProps) {
  if (words.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No mispronounced words. Read another passage to keep practicing.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {words.map((word) => {
        const isPlaying =
          player?.activeSpan?.[0] === word.start &&
          player?.activeSpan?.[1] === word.end

        return (
          <li
            key={`${word.word}-${word.start}`}
            className="flex items-start gap-3 rounded-lg border p-3 text-left"
          >
            <div className="flex gap-2">
              {player && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Play your recording of ${word.word}`}
                  className={cn(isPlaying && 'text-primary')}
                  disabled={!player.canPlay}
                  onClick={() => player.playSpan(word.start, word.end)}
                >
                  <Volume2 className={cn(isPlaying && 'animate-pulse')} />
                </Button>
              )}
              <ReferenceButton
                text={word.word}
                label={`Play native reference for ${word.word}`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{word.word}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
                  {word.phoneme}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {word.explanation}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
