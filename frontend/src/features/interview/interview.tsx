import { useState } from 'react'
import { Loader2, RotateCcw, Square, Video } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LevelMeter } from '@/components/level-meter'
import { ScoringSkeleton } from '@/features/passage-scoring/scoring-skeleton'
import { ClipTooWeakError } from '@/features/passage-scoring/use-score-passage'

import { CameraPreview } from './camera-preview'
import { collapseLineBreaks } from './interview-question'
import { InterviewResults } from './interview-results'
import { QuestionPicker } from './question-picker'
import { useInterviewQuestions } from './use-interview-questions'
import { useScoreInterview } from './use-score-interview'
import { useVideoRecorder } from './use-video-recorder'

export function Interview() {
  const questions = useInterviewQuestions()
  const recorder = useVideoRecorder()
  const scoring = useScoreInterview()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const selected =
    selectedIndex === null ? null : (questions.data?.[selectedIndex] ?? null)
  const isClipTooWeak = scoring.error instanceof ClipTooWeakError

  function handleSelect(index: number) {
    setSelectedIndex(index)
    recorder.reset()
    scoring.reset()
  }

  function handleScore() {
    if (!recorder.recording || !selected) {
      return
    }
    scoring.mutate({
      scriptedAnswer: collapseLineBreaks(selected.scripted_answer),
      question: selected.question,
      video: recorder.recording.blob,
    })
  }

  function handleRecordAgain() {
    recorder.reset()
    scoring.reset()
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Interview</h2>
        <p className="text-muted-foreground">
          Record a spoken answer on camera and get one combined report of
          pronunciation and delivery.
        </p>
      </header>

      {questions.isPending && (
        <p className="text-sm text-muted-foreground">Loading questions...</p>
      )}

      {questions.isError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive"
        >
          Could not load questions, check the backend is running and try again.
        </p>
      )}

      {questions.isSuccess && questions.data.length === 0 && (
        <p className="rounded-lg border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
          No interview questions are configured. Point
          DICTION_INTERVIEW_SOURCE_DIR at a question bank to practice.
        </p>
      )}

      {questions.isSuccess && questions.data.length > 0 && (
        <QuestionPicker
          questions={questions.data}
          selectedIndex={selectedIndex}
          disabled={recorder.status === 'recording'}
          onSelect={handleSelect}
        />
      )}

      <div className="flex flex-col items-center gap-3">
        {recorder.status === 'recording' && recorder.stream && (
          <CameraPreview stream={recorder.stream} />
        )}

        {recorder.status === 'idle' && (
          <Button onClick={() => void recorder.start()} disabled={!selected}>
            <Video />
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
              Allow camera and microphone access, then record.
            </p>
            <Button onClick={() => void recorder.start()}>
              <Video />
              Record
            </Button>
          </div>
        )}

        {recorder.status === 'recorded' &&
          recorder.recording &&
          !scoring.isSuccess && (
            <div className="flex w-full flex-col items-center gap-3">
              <video
                src={recorder.recording.url}
                controls
                className="w-full max-w-md rounded-lg border"
              />
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
        <div className="flex flex-col gap-6">
          <InterviewResults
            result={scoring.data}
            recordingUrl={recorder.recording?.url}
          />
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleRecordAgain}>
              <RotateCcw />
              Record again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
