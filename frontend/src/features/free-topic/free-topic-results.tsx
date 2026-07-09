import { ScoreResults } from '@/features/passage-scoring/score-results'

import { CritiqueList } from './critique-list'
import type { FreeTopicResult } from './free-topic-result'

interface FreeTopicResultsProps {
  result: FreeTopicResult
  recordingUrl: string | undefined
}

export function FreeTopicResults({
  result,
  recordingUrl,
}: FreeTopicResultsProps) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-label="Pronunciation">
        <h3 className="text-left text-xl font-medium">Pronunciation</h3>
        <p className="text-xs text-muted-foreground">
          Scored against the words we recognized you saying, not a fixed script,
          so read these as a directional guide. Recognition also tidies up
          disfluent speech, so some slips may not show here.
        </p>
        <ScoreResults result={result} recordingUrl={recordingUrl} />
      </section>

      <section
        className="flex flex-col gap-3"
        aria-label="Grammar and phrasing"
      >
        <h3 className="text-left text-xl font-medium">Grammar and phrasing</h3>
        <CritiqueList points={result.critique} />
      </section>

      <section className="flex flex-col gap-2" aria-label="What we heard">
        <h3 className="text-left text-xl font-medium">What we heard</h3>
        <p className="rounded-lg border bg-muted/40 p-3 text-left text-sm text-muted-foreground">
          {result.transcript}
        </p>
      </section>
    </div>
  )
}
