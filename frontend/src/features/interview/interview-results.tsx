import { ScoreResults } from '@/features/passage-scoring/score-results'

import { DeliveryMetrics } from './delivery-metrics'
import type { InterviewResult } from './interview-result'

interface InterviewResultsProps {
  result: InterviewResult
  recordingUrl: string | undefined
}

export function InterviewResults({
  result,
  recordingUrl,
}: InterviewResultsProps) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-label="Pronunciation">
        <h3 className="text-left text-xl font-medium">Pronunciation</h3>
        <p className="text-xs text-muted-foreground">
          Scored against the scripted answer you rehearsed. Read these as a
          directional guide.
        </p>
        <ScoreResults result={result} recordingUrl={recordingUrl} />
      </section>

      {result.cv ? <DeliveryMetrics cv={result.cv} /> : null}

      {recordingUrl ? (
        <section className="flex flex-col gap-3" aria-label="Your answer">
          <h3 className="text-left text-xl font-medium">Your answer</h3>
          <video
            src={recordingUrl}
            controls
            className="w-full max-w-md rounded-lg border"
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-2" aria-label="What we heard">
        <h3 className="text-left text-xl font-medium">What we heard</h3>
        <p className="rounded-lg border bg-muted/40 p-3 text-left text-sm text-muted-foreground">
          {result.transcript}
        </p>
      </section>
    </div>
  )
}
