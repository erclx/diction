import { useState } from 'react'
import {
  ArrowRight,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LevelMeter } from '@/components/level-meter'
import { MetricCard } from '@/components/metric-card'
import { OwnRecordingAudio } from '@/features/audio-channel/own-recording-audio'
import { ReferenceButton } from '@/features/reference-audio/reference-button'
import { useRecorder } from '@/features/passage-scoring/use-recorder'
import { ClipTooWeakError } from '@/features/passage-scoring/use-score-passage'
import { useGenerateContent } from '@/features/practice-content/use-generate-content'

import { SHADOWING_PROMPTS } from './shadowing-prompts'
import { useScoreShadowing } from './use-score-shadowing'

export function Shadowing() {
  const recorder = useRecorder()
  const scoring = useScoreShadowing()
  const generation = useGenerateContent()
  const clipTooWeakDetail =
    scoring.error instanceof ClipTooWeakError ? scoring.error.detail : null
  const [promptIndex, setPromptIndex] = useState(0)
  const [generatedLine, setGeneratedLine] = useState<string | null>(null)
  const prompt =
    generatedLine ?? SHADOWING_PROMPTS[promptIndex % SHADOWING_PROMPTS.length]

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
    setGeneratedLine(null)
    recorder.reset()
    scoring.reset()
  }

  function handleGenerate() {
    generation.mutate(
      { kind: 'shadowing' },
      {
        onSuccess: (text) => {
          setGeneratedLine(text)
          recorder.reset()
          scoring.reset()
        },
      },
    )
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
          <div className="flex flex-col gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="self-start"
              onClick={handleGenerate}
              disabled={generation.isPending}
            >
              {generation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              Generate a line
            </Button>
            {generation.isError && (
              <p role="alert" className="text-sm text-destructive">
                Generation failed, try again or use the next line.
              </p>
            )}
          </div>
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
          <div className="flex flex-col items-center gap-3">
            <LevelMeter level={recorder.level} />
            <Button variant="destructive" onClick={recorder.stop}>
              <Square />
              Stop
            </Button>
          </div>
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
            <OwnRecordingAudio
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

      {clipTooWeakDetail && (
        <p
          role="alert"
          className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-center text-sm text-warning"
        >
          {clipTooWeakDetail}
        </p>
      )}

      {scoring.isError && !clipTooWeakDetail && (
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
            <MetricCard
              label="Rhythm match"
              display={String(Math.round(scoring.data.rhythm_match))}
            />
            <MetricCard
              label="Intonation match"
              display={String(Math.round(scoring.data.intonation_match))}
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
