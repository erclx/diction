import { useState } from 'react'
import { ArrowRight, Loader2, Mic, RotateCcw, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LevelMeter } from '@/components/level-meter'
import { OwnRecordingAudio } from '@/features/audio-channel/own-recording-audio'
import { useRecorder } from '@/features/passage-scoring/use-recorder'
import { ClipTooWeakError } from '@/features/passage-scoring/use-score-passage'

import { FREE_TOPIC_PROMPTS } from './free-topic-prompts'
import { FreeTopicResults } from './free-topic-results'
import { useScoreFreeTopic } from './use-score-free-topic'

export function FreeTopic() {
  const recorder = useRecorder()
  const scoring = useScoreFreeTopic()
  const [promptIndex, setPromptIndex] = useState(0)
  const topic = FREE_TOPIC_PROMPTS[promptIndex % FREE_TOPIC_PROMPTS.length]
  const isClipTooWeak = scoring.error instanceof ClipTooWeakError

  function handleScore() {
    if (!recorder.recording) {
      return
    }
    scoring.mutate({ topic, audio: recorder.recording.blob })
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
        <h2 className="font-serif text-2xl font-semibold">Free topic</h2>
        <p className="text-muted-foreground">
          Speak on the topic for a minute or two, then get pronunciation and
          language feedback.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Speak about this</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="font-serif text-lg leading-relaxed">{topic}</p>
          <span className="text-sm text-muted-foreground">
            Aim for one to two minutes of natural speech.
          </span>
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
        <div className="flex flex-col gap-6">
          <FreeTopicResults
            result={scoring.data}
            recordingUrl={recorder.recording?.url}
          />
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={handleRecordAgain}>
              <RotateCcw />
              Record again
            </Button>
            <Button onClick={handleNext}>
              Next topic
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
