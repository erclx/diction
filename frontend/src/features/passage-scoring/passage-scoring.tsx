import { Loader2, Mic, RotateCcw, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LevelMeter } from '@/components/level-meter'
import { OwnRecordingAudio } from '@/features/audio-channel/own-recording-audio'
import { ReferenceButton } from '@/features/reference-audio/reference-button'

import { ClipTooWeakError, useScorePassage } from './use-score-passage'
import { ScoreResults } from './score-results'
import { ScoringSkeleton } from './scoring-skeleton'
import { useRecorder } from './use-recorder'

const PRACTICE_PASSAGE =
  'The quick brown fox jumps over the lazy dog while three thoughtful children watch the bright morning sun rise above the quiet valley.'

export function PassageScoring() {
  const recorder = useRecorder()
  const scoring = useScorePassage()

  function handleReset() {
    recorder.reset()
    scoring.reset()
  }

  function handleScore() {
    if (!recorder.recording) {
      return
    }
    scoring.mutate({
      passage: PRACTICE_PASSAGE,
      audio: recorder.recording.blob,
    })
  }

  const isClipTooWeak = scoring.error instanceof ClipTooWeakError

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Passage reading</h2>
        <p className="text-muted-foreground">
          Read the passage aloud, then score your pronunciation.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Read this aloud</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="font-serif text-lg leading-relaxed">
            {PRACTICE_PASSAGE}
          </p>
          <div className="flex items-center gap-2">
            <ReferenceButton
              text={PRACTICE_PASSAGE}
              label="Play native reference for the passage"
            />
            <span className="text-sm text-muted-foreground">
              Hear it read aloud
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
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

      {scoring.isPending && <ScoringSkeleton />}

      {scoring.isSuccess && (
        <ScoreResults
          result={scoring.data}
          recordingUrl={recorder.recording?.url}
        />
      )}
    </div>
  )
}
