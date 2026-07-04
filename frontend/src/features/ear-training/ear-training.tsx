import { AudioLines, Check, Loader2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useReferenceAudio } from '@/features/reference-audio/use-reference-audio'
import { cn } from '@/lib/utils'

import type { MinimalPairContrast } from '@/features/minimal-pairs/minimal-pair'
import { filterByPhoneme } from '@/features/minimal-pairs/minimal-pair'
import { useMinimalPairsQuery } from '@/features/minimal-pairs/use-minimal-pairs'

type Side = 'a' | 'b'

interface Round {
  label: string
  wordA: string
  wordB: string
  targetSide: Side
}

function targetWordOf(round: Round): string {
  return round.targetSide === 'a' ? round.wordA : round.wordB
}

function pickRound(
  contrasts: readonly MinimalPairContrast[],
  random: () => number,
): Round {
  const contrast = contrasts[Math.floor(random() * contrasts.length)]
  const pair = contrast.pairs[Math.floor(random() * contrast.pairs.length)]
  const targetSide: Side = random() < 0.5 ? 'a' : 'b'
  return {
    label: contrast.label,
    wordA: pair.word_a,
    wordB: pair.word_b,
    targetSide,
  }
}

interface DrillRoundProps {
  round: Round
  onAnswer: (correct: boolean) => void
  onNext: () => void
}

function DrillRound({ round, onAnswer, onNext }: DrillRoundProps) {
  const [picked, setPicked] = useState<Side | null>(null)
  const reference = useReferenceAudio(targetWordOf(round))
  const hasPlayedRef = useRef(false)
  const { play } = reference

  useEffect(() => {
    if (hasPlayedRef.current) {
      return
    }
    hasPlayedRef.current = true
    play()
  }, [play])

  const handlePick = (side: Side) => {
    if (picked !== null) {
      return
    }
    setPicked(side)
    onAnswer(side === round.targetSide)
  }

  const sides: readonly { side: Side; word: string }[] = [
    { side: 'a', word: round.wordA },
    { side: 'b', word: round.wordB },
  ]
  const answered = picked !== null
  const wasCorrect = picked === round.targetSide

  return (
    <Card>
      <CardHeader>
        <CardTitle>{round.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-center text-muted-foreground">
          Which word did you hear?
        </p>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={reference.play}
            disabled={reference.isFetching}
            aria-label="Play again"
          >
            {reference.isFetching ? (
              <Loader2 className="animate-spin" />
            ) : (
              <AudioLines />
            )}
            Play again
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {sides.map(({ side, word }) => {
            const isTarget = side === round.targetSide
            return (
              <Button
                key={side}
                variant="outline"
                size="lg"
                disabled={answered}
                onClick={() => handlePick(side)}
                className={cn(
                  'h-auto py-6 font-serif text-xl',
                  answered && isTarget && 'border-success text-success',
                  answered &&
                    !isTarget &&
                    picked === side &&
                    'border-destructive text-destructive',
                )}
              >
                {word}
              </Button>
            )
          })}
        </div>

        {answered && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p
              role="status"
              className={cn(
                'flex items-center gap-2 text-sm font-medium',
                wasCorrect ? 'text-success' : 'text-destructive',
              )}
            >
              {wasCorrect ? (
                <>
                  <Check className="size-4" />
                  Correct
                </>
              ) : (
                <>
                  <X className="size-4" />
                  It was {targetWordOf(round)}
                </>
              )}
            </p>
            <Button onClick={onNext}>Next</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ScoreState {
  correct: number
  attempted: number
}

interface EarTrainingProps {
  random?: () => number
}

export function EarTraining({ random = Math.random }: EarTrainingProps) {
  const query = useMinimalPairsQuery()
  const [searchParams] = useSearchParams()
  const phoneme = searchParams.get('phoneme')
  const [round, setRound] = useState<Round | null>(null)
  const [roundId, setRoundId] = useState(0)
  const [score, setScore] = useState<ScoreState>({ correct: 0, attempted: 0 })

  const contrasts = useMemo(
    () => filterByPhoneme(query.data ?? [], phoneme),
    [query.data, phoneme],
  )

  const handleStart = () => {
    if (contrasts.length === 0) {
      return
    }
    setRound(pickRound(contrasts, random))
  }

  const handleAnswer = (correct: boolean) => {
    setScore((previous) => ({
      correct: previous.correct + (correct ? 1 : 0),
      attempted: previous.attempted + 1,
    }))
  }

  const handleNext = () => {
    if (contrasts.length === 0) {
      return
    }
    setRoundId((id) => id + 1)
    setRound(pickRound(contrasts, random))
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Ear training</h2>
        <p className="text-muted-foreground">
          Hear one word from a pair and pick which one was said.
        </p>
      </header>

      {query.isPending && (
        <div
          className="flex items-center justify-center gap-2 py-6 text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" />
          <span>Loading drills</span>
        </div>
      )}

      {query.isError && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            Could not load the drills, check the backend is running and try
            again.
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {query.isSuccess &&
        (contrasts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-muted-foreground">
                No drill pairs are available yet.
              </p>
              <Button asChild>
                <Link to="/">Back to practice</Link>
              </Button>
            </CardContent>
          </Card>
        ) : round === null ? (
          <Card>
            <CardHeader>
              <CardTitle>Ready to train your ear</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-muted-foreground">
                You will hear one word from a pair. Pick the one you heard.
              </p>
              <Button onClick={handleStart}>Start</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-end">
              <span className="text-sm tabular-nums text-muted-foreground">
                {`${score.correct} of ${score.attempted} correct`}
              </span>
            </div>
            <DrillRound
              key={roundId}
              round={round}
              onAnswer={handleAnswer}
              onNext={handleNext}
            />
          </>
        ))}
    </div>
  )
}
