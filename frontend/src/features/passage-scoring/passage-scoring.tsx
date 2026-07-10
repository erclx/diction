import { useState } from 'react'
import { Loader2, Mic, RotateCcw, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { LevelMeter } from '@/components/level-meter'
import { OwnRecordingAudio } from '@/features/audio-channel/own-recording-audio'
import { ReferenceButton } from '@/features/reference-audio/reference-button'
import { PASSAGE_MAX_LENGTH, validatePracticeText } from '@/lib/practice-text'

import { ClipTooWeakError, useScorePassage } from './use-score-passage'
import { ScoreResults } from './score-results'
import { ScoringSkeleton } from './scoring-skeleton'
import { useRecorder } from './use-recorder'

const DEFAULT_PASSAGE =
  'The quick brown fox jumps over the lazy dog while three thoughtful children watch the bright morning sun rise above the quiet valley.'

export function PassageScoring() {
  const recorder = useRecorder()
  const scoring = useScorePassage()
  const [passage, setPassage] = useState(DEFAULT_PASSAGE)

  const validation = validatePracticeText(passage, PASSAGE_MAX_LENGTH)
  const isEditing = recorder.status === 'idle'

  function handleReset() {
    recorder.reset()
    scoring.reset()
  }

  function handleScore() {
    if (!recorder.recording) {
      return
    }
    scoring.mutate({
      passage: validation.value,
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
          {isEditing ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="passage-input" className="sr-only">
                Passage to read
              </label>
              <Textarea
                id="passage-input"
                value={passage}
                onChange={(event) => setPassage(event.target.value)}
                aria-invalid={validation.error !== null}
                aria-describedby={
                  validation.error ? 'passage-error' : undefined
                }
                className="min-h-24 font-serif text-lg leading-relaxed"
              />
              {validation.error ? (
                <p id="passage-error" className="text-sm text-destructive">
                  {validation.error}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Edit the passage or type your own, then read it aloud.
                </p>
              )}
            </div>
          ) : (
            <p className="font-serif text-lg leading-relaxed">
              {validation.value}
            </p>
          )}
          <div className="flex items-center gap-2">
            <ReferenceButton
              text={validation.value}
              label="Play native reference for the passage"
              disabled={validation.error !== null}
            />
            <span className="text-sm text-muted-foreground">
              Hear it read aloud
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3">
        {recorder.status === 'idle' && (
          <Button
            onClick={() => void recorder.start()}
            disabled={validation.error !== null}
          >
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
