import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { BACKEND_URL } from '@/config'
import { OwnRecordingAudio } from '@/features/audio-channel/own-recording-audio'
import { CritiqueList } from '@/features/free-topic/critique-list'
import { DeliveryMetrics } from '@/features/interview/delivery-metrics'
import { FlaggedWordList } from '@/features/passage-scoring/flagged-word-list'
import { ScoreMetric } from '@/features/passage-scoring/score-metric'
import { useSpanPlayer } from '@/features/passage-scoring/use-span-player'

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
  const recordingUrl = query.data?.has_recording
    ? `${BACKEND_URL}/api/sessions/${id}/recording`
    : undefined
  const player = useSpanPlayer(recordingUrl)

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

          {query.data.prompt && (
            <div className="flex flex-col gap-3">
              <h3 className="text-left text-xl font-medium">Question</h3>
              <p className="rounded-lg border bg-card p-4 text-left font-serif text-base leading-relaxed">
                {query.data.prompt}
              </p>
            </div>
          )}

          {query.data.passage && (
            <div className="flex flex-col gap-3">
              <h3 className="text-left text-xl font-medium">
                {query.data.mode === 'interview'
                  ? 'Answer to rehearse'
                  : 'Passage'}
              </h3>
              <p className="rounded-lg border bg-card p-4 text-left font-serif text-base leading-relaxed">
                {query.data.passage}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {METRICS.map((metric) => (
              <ScoreMetric
                key={metric.key}
                label={metric.label}
                value={query.data[metric.key]}
              />
            ))}
          </div>

          {query.data.cv && <DeliveryMetrics cv={query.data.cv} />}

          {query.data.has_recording && (
            <div className="flex flex-col gap-3">
              <h3 className="text-left text-xl font-medium">Your recording</h3>
              {query.data.mode === 'interview' ? (
                <video
                  src={`${BACKEND_URL}/api/sessions/${query.data.id}/recording`}
                  controls
                  className="w-full max-w-md rounded-lg border"
                />
              ) : (
                <OwnRecordingAudio
                  src={`${BACKEND_URL}/api/sessions/${query.data.id}/recording`}
                  className="w-full max-w-sm"
                />
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h3 className="text-left text-xl font-medium">Flagged words</h3>
            <FlaggedWordList
              words={query.data.flagged_words}
              player={query.data.has_recording ? player : undefined}
            />
          </div>

          {query.data.critique && (
            <div className="flex flex-col gap-3">
              <h3 className="text-left text-xl font-medium">
                Grammar and phrasing
              </h3>
              <CritiqueList
                points={query.data.critique
                  .split('\n')
                  .filter((point) => point.trim().length > 0)}
              />
            </div>
          )}

          {query.data.transcript && (
            <div className="flex flex-col gap-3">
              <h3 className="text-left text-xl font-medium">What you said</h3>
              <p className="rounded-lg border bg-muted/40 p-4 text-left text-sm text-muted-foreground">
                {query.data.transcript}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
