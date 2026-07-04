import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { FlaggedWordList } from '@/features/passage-scoring/flagged-word-list'
import { ScoreMetric } from '@/features/passage-scoring/score-metric'

import { formatSessionDate } from './format'
import { SessionNotFoundError, useSessionQuery } from './use-sessions'

interface SessionDetailProps {
  id: number
}

const METRICS = [
  { key: 'completeness', label: 'Completeness' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'fluency', label: 'Fluency' },
  { key: 'phoneme_quality', label: 'Phoneme quality' },
] as const

export function SessionDetail({ id }: SessionDetailProps) {
  const query = useSessionQuery(id)

  return (
    <div className="flex flex-col gap-6">
      <Button
        asChild
        variant="ghost"
        className="self-start px-2 text-muted-foreground"
      >
        <Link to="/history">
          <ArrowLeft />
          Back to history
        </Link>
      </Button>

      {query.isPending && (
        <div
          className="flex items-center justify-center gap-2 p-8 text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" />
          <span>Loading session</span>
        </div>
      )}

      {query.isError && (
        <p role="alert" className="p-8 text-center text-sm text-destructive">
          {query.error instanceof SessionNotFoundError
            ? 'This session no longer exists, go back and pick another.'
            : 'Could not load this session, check the backend is running and try again.'}
        </p>
      )}

      {query.isSuccess && (
        <section className="flex flex-col gap-6" aria-label="Session detail">
          <header className="flex flex-col gap-1 text-left">
            <h2 className="font-serif text-xl font-semibold">
              {formatSessionDate(query.data.created_at)}
            </h2>
            <p className="text-sm capitalize text-muted-foreground">
              {query.data.mode}
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {METRICS.map((metric) => (
              <ScoreMetric
                key={metric.key}
                label={metric.label}
                value={query.data[metric.key]}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-left text-xl font-medium">Flagged words</h3>
            <FlaggedWordList words={query.data.flagged_words} />
          </div>
        </section>
      )}
    </div>
  )
}
