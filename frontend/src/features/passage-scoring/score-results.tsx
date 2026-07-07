import type { ScoreResult } from './score-result'
import { ScoreMetric } from './score-metric'
import { FlaggedWordList } from './flagged-word-list'
import { useSpanPlayer } from './use-span-player'

interface ScoreResultsProps {
  result: ScoreResult
  recordingUrl: string | undefined
}

const COMPLETENESS_CAVEAT =
  'Scored 0 to 100. The exact share of the passage you read aloud.'

interface MetricDescriptor {
  key: keyof Omit<ScoreResult, 'flagged_words'>
  label: string
  caveat?: string
}

const METRICS: readonly MetricDescriptor[] = [
  { key: 'completeness', label: 'Completeness', caveat: COMPLETENESS_CAVEAT },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'fluency', label: 'Fluency' },
  { key: 'phoneme_quality', label: 'Phoneme quality' },
]

export function ScoreResults({ result, recordingUrl }: ScoreResultsProps) {
  const player = useSpanPlayer(recordingUrl)

  return (
    <section className="flex flex-col gap-6" aria-label="Score results">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRICS.map((metric) => (
          <ScoreMetric
            key={metric.key}
            label={metric.label}
            value={result[metric.key]}
            caveat={metric.caveat}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-left text-xl font-medium">Flagged words</h3>
        <FlaggedWordList words={result.flagged_words} player={player} />
      </div>
    </section>
  )
}
