import { useState } from 'react'
import { ArrowRight, Loader2, Mic, RotateCcw, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReferenceButton } from '@/features/reference-audio/reference-button'
import { useRecorder } from '@/features/passage-scoring/use-recorder'

import { SHADOWING_PROMPTS } from './shadowing-prompts'
import { useScoreShadowing } from './use-score-shadowing'

interface MatchScoreProps {
  label: string
  value: number
}

function MatchScore({ label, value }: MatchScoreProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 p-4">
        <span className="text-2xl font-semibold tabular-nums">
          {Math.round(value)}
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  )
}

export function Shadowing() {
  const recorder = useRecorder()
  const scoring = useScoreShadowing()
  const [promptIndex, setPromptIndex] = useState(0)
  const prompt = SHADOWING_PROMPTS[promptIndex % SHADOWING_PROMPTS.length]

  function handleScore() {
    if (!recorder.recording) {
      return
    }
    scoring.mutate({ referenceText: prompt, audio: recorder.recording.blob })
  }

  function handleRecordAgain() {
    recorder.reset()
    scoring.reset()
  }

  function handleNext() {
    setPromptIndex((index) => index + 1)
    recorder.reset()
    scoring.reset()
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Shadowing</h2>
        <p className="text-muted-foreground">
          Play the native line, then record yourself saying it right after.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <p className="font-serif text-lg leading-relaxed">{prompt}</p>
          <div className="flex items-center gap-2">
            <ReferenceButton
              text={prompt}
              label="Play native reference for this line"
            />
            <span className="text-sm text-muted-foreground">
              Hear the line, then shadow it
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
                  {scoring.isPending && <Loader2 className="animate-spin" />}
                  Score
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {scoring.isError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive"
        >
          Scoring failed, check the backend is running and try again.
        </p>
      )}

      {scoring.isSuccess && (
        <div className="flex flex-col items-center gap-3">
          <div className="grid w-full grid-cols-2 gap-3">
            <MatchScore
              label="Rhythm match"
              value={scoring.data.rhythm_match}
            />
            <MatchScore
              label="Intonation match"
              value={scoring.data.intonation_match}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A directional read while prosody scoring is still being calibrated,
            not a settled grade.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRecordAgain}>
              <RotateCcw />
              Record again
            </Button>
            <Button onClick={handleNext}>
              Next line
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
