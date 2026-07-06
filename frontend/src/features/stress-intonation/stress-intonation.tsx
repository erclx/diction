import { useState } from 'react'
import { ArrowRight, Loader2, Mic, RotateCcw, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReferenceButton } from '@/features/reference-audio/reference-button'
import { useRecorder } from '@/features/passage-scoring/use-recorder'
import { cn } from '@/lib/utils'

import type { ProsodyAnalysis, StressMark } from './use-analyze-prosody'
import { useAnalyzeProsody } from './use-analyze-prosody'

const STRESS_PROMPTS = [
  'I never said she stole the money.',
  'The photographer took a photograph of the photography studio.',
  'Please record the record before the meeting.',
  'They decided to present the present at the ceremony.',
] as const

const CHART_WIDTH = 320
const CHART_HEIGHT = 96
const CHART_PADDING = 10

function contourPoints(
  values: readonly number[],
  min: number,
  max: number,
): string {
  if (values.length === 0) {
    return ''
  }
  const span = max - min
  const usableWidth = CHART_WIDTH - CHART_PADDING * 2
  const usableHeight = CHART_HEIGHT - CHART_PADDING * 2
  const lastIndex = Math.max(values.length - 1, 1)
  return values
    .map((value, index) => {
      const x = CHART_PADDING + (index / lastIndex) * usableWidth
      const ratio = span === 0 ? 0.5 : (value - min) / span
      const y = CHART_PADDING + (1 - ratio) * usableHeight
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

interface ContourChartProps {
  reference: readonly number[]
  learner: readonly number[]
}

function ContourChart({ reference, learner }: ContourChartProps) {
  const values = [...reference, ...learner]
  const min = values.length > 0 ? Math.min(...values) : 0
  const max = values.length > 0 ? Math.max(...values) : 0

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="h-28 w-full"
      role="img"
      aria-label="Reference and your pitch contour"
    >
      <polyline
        points={contourPoints(reference, min, max)}
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={contourPoints(learner, min, max)}
        fill="none"
        className="stroke-muted-foreground"
        strokeWidth={2}
        strokeDasharray="4 3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

interface StressLineProps {
  marks: readonly StressMark[]
}

function StressLine({ marks }: StressLineProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      {marks.map((mark, wordIndex) => (
        <div
          key={`${mark.word}-${wordIndex}`}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex gap-1 font-mono text-sm">
            {mark.syllables.map((syllable, syllableIndex) => (
              <span
                key={`${syllable}-${syllableIndex}`}
                className={cn(
                  'rounded px-1',
                  syllableIndex === mark.stress_index
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {syllable}
              </span>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{mark.word}</span>
        </div>
      ))}
    </div>
  )
}

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

interface AnalysisResultProps {
  analysis: ProsodyAnalysis
}

function AnalysisResult({ analysis }: AnalysisResultProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <ContourChart
            reference={analysis.reference_contour}
            learner={analysis.learner_contour}
          />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-primary" />
              Reference
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-muted-foreground" />
              You
            </span>
          </div>
          <StressLine marks={analysis.stress_marks} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MatchScore label="Rhythm match" value={analysis.rhythm_match} />
        <MatchScore
          label="Intonation match"
          value={analysis.intonation_match}
        />
      </div>
    </div>
  )
}

export function StressIntonation() {
  const recorder = useRecorder()
  const analysis = useAnalyzeProsody()
  const [promptIndex, setPromptIndex] = useState(0)
  const prompt = STRESS_PROMPTS[promptIndex % STRESS_PROMPTS.length]

  function handleAnalyze() {
    if (!recorder.recording) {
      return
    }
    analysis.mutate({ referenceText: prompt, audio: recorder.recording.blob })
  }

  function handleRecordAgain() {
    recorder.reset()
    analysis.reset()
  }

  function handleNext() {
    setPromptIndex((index) => index + 1)
    recorder.reset()
    analysis.reset()
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">
          Stress and intonation
        </h2>
        <p className="text-muted-foreground">
          Read the line, then see its stressed syllables and pitch shape against
          your own.
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
              Hear the line, then read it back
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
            {!analysis.isSuccess && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRecordAgain}
                  disabled={analysis.isPending}
                >
                  <RotateCcw />
                  Record again
                </Button>
                <Button onClick={handleAnalyze} disabled={analysis.isPending}>
                  {analysis.isPending && <Loader2 className="animate-spin" />}
                  Analyze
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {analysis.isError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive"
        >
          Analysis failed, check the backend is running and try again.
        </p>
      )}

      {analysis.isSuccess && (
        <div className="flex flex-col items-center gap-3">
          <AnalysisResult analysis={analysis.data} />
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
