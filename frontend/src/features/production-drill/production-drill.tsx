import { useMemo, useState } from 'react'
import { ArrowRight, Loader2, Mic, RotateCcw, Square } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ReferenceButton } from '@/features/reference-audio/reference-button'
import { useRecorder } from '@/features/passage-scoring/use-recorder'
import { ClipTooWeakError } from '@/features/passage-scoring/use-score-passage'

import type { MinimalPairContrast } from '@/features/minimal-pairs/minimal-pair'
import { filterByPhoneme } from '@/features/minimal-pairs/minimal-pair'
import { useMinimalPairsQuery } from '@/features/minimal-pairs/use-minimal-pairs'
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
  const pairs = useMinimalPairsQuery()
  const recorder = useRecorder()
  const scoring = useScoreWord()
  const [searchParams] = useSearchParams()
  const phoneme = searchParams.get('phoneme')
  const [repIndex, setRepIndex] = useState(0)

  const reps = useMemo(
    () => buildReps(filterByPhoneme(pairs.data ?? [], phoneme)),
    [pairs.data, phoneme],
  )
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

          {scoring.isSuccess && (
            <div className="flex flex-col items-center gap-3">
              <div
                role="status"
                className="flex w-full flex-col items-center gap-1 rounded-lg border border-border bg-muted/40 p-4 text-center"
              >
                <span className="text-3xl font-semibold tabular-nums">
                  {Math.round(scoring.data.phoneme_quality)}
                </span>
                <span className="text-sm text-muted-foreground">
                  Sound quality for “{rep.target}”, higher is cleaner
                </span>
              </div>
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
