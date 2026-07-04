import { useMemo, useState } from 'react'
import { ArrowRight, Loader2, Mic, RotateCcw, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ReferenceButton } from '@/features/reference-audio/reference-button'
import { useRecorder } from '@/features/passage-scoring/use-recorder'
import { ClipTooWeakError } from '@/features/passage-scoring/use-score-passage'
import { cn } from '@/lib/utils'

import type { MinimalPairContrast } from './use-minimal-pairs'
import { useMinimalPairs } from './use-minimal-pairs'
import { useScoreWord } from './use-score-word'

interface Rep {
  target: string
  other: string
  label: string
}

function buildReps(contrasts: MinimalPairContrast[]): Rep[] {
  return contrasts.flatMap((contrast) =>
    contrast.pairs.map((pair) => ({
      target: pair.word_a,
      other: pair.word_b,
      label: contrast.label,
    })),
  )
}

export function ProductionDrill() {
  const pairs = useMinimalPairs()
  const recorder = useRecorder()
  const scoring = useScoreWord()
  const [repIndex, setRepIndex] = useState(0)

  const reps = useMemo(() => buildReps(pairs.data ?? []), [pairs.data])
  const rep = reps.length > 0 ? reps[repIndex % reps.length] : null

  function handleScore() {
    if (!recorder.recording || !rep) {
      return
    }
    scoring.mutate({ word: rep.target, audio: recorder.recording.blob })
  }

  function handleRecordAgain() {
    recorder.reset()
    scoring.reset()
  }

  function handleNext() {
    setRepIndex((index) => index + 1)
    recorder.reset()
    scoring.reset()
  }

  const isClipTooWeak = scoring.error instanceof ClipTooWeakError
  const isPass = scoring.isSuccess && scoring.data.flagged_words.length === 0
  const isRetry = scoring.isSuccess && scoring.data.flagged_words.length > 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">
          Minimal pair production
        </h2>
        <p className="text-muted-foreground">
          Say the highlighted word, then check the target sound landed.
        </p>
      </header>

      {pairs.isPending && <Skeleton className="h-48 w-full rounded-xl" />}

      {pairs.isError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive"
        >
          Could not load drills, check the backend is running and try again.
        </p>
      )}

      {!pairs.isPending && !pairs.isError && !rep && (
        <p className="text-center text-sm text-muted-foreground">
          No minimal-pair drills are available yet.
        </p>
      )}

      {rep && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{rep.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="font-serif text-lg leading-relaxed">
                <span className="font-semibold text-primary">{rep.target}</span>
                <span className="text-muted-foreground"> / {rep.other}</span>
              </p>
              <div className="flex items-center gap-2">
                <ReferenceButton
                  text={rep.target}
                  label={`Play native reference for ${rep.target}`}
                />
                <span className="text-sm text-muted-foreground">
                  Say “{rep.target}”
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-3">
            {recorder.status === 'idle' && (
              <Button onClick={() => void recorder.start()}>
                <Mic />
                Record
              </Button>
            )}

            {recorder.status === 'recording' && (
              <Button variant="destructive" onClick={recorder.stop}>
                <Square />
                Stop
              </Button>
            )}

            {recorder.status === 'denied' && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-destructive">
                  Allow microphone access, then record.
                </p>
                <Button onClick={() => void recorder.start()}>
                  <Mic />
                  Record
                </Button>
              </div>
            )}

            {recorder.status === 'recorded' && recorder.recording && (
              <div className="flex w-full flex-col items-center gap-3">
                <audio
                  controls
                  src={recorder.recording.url}
                  className="w-full max-w-sm"
                />
                {!scoring.isSuccess && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRecordAgain}
                      disabled={scoring.isPending}
                    >
                      <RotateCcw />
                      Record again
                    </Button>
                    <Button onClick={handleScore} disabled={scoring.isPending}>
                      {scoring.isPending && (
                        <Loader2 className="animate-spin" />
                      )}
                      Check
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isClipTooWeak && (
            <p
              role="alert"
              className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-center text-sm text-warning"
            >
              Recording was too short or quiet, record again and speak clearly.
            </p>
          )}

          {scoring.isError && !isClipTooWeak && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive"
            >
              Scoring failed, check the backend is running and try again.
            </p>
          )}

          {isPass && (
            <div className="flex flex-col items-center gap-3">
              <p
                role="status"
                className="w-full rounded-lg border border-success/50 bg-success/10 p-3 text-center text-sm text-success"
              >
                Nice, “{rep.target}” landed.
              </p>
              <Button onClick={handleNext}>
                Next word
                <ArrowRight />
              </Button>
            </div>
          )}

          {isRetry && (
            <div className="flex flex-col items-center gap-3">
              <p
                role="status"
                className={cn(
                  'w-full rounded-lg border border-warning/50 bg-warning/10 p-3 text-center text-sm text-warning',
                )}
              >
                Not quite, try “{rep.target}” again.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRecordAgain}>
                  <RotateCcw />
                  Try again
                </Button>
                <Button onClick={handleNext}>
                  Next word
                  <ArrowRight />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
