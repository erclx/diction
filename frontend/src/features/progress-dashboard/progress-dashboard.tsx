import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionsQuery } from '@/features/session-history/use-sessions'
import type { SessionListItem } from '@/features/session-history/session'

import type { WeakSound } from './weak-sound'
import { useWeakSoundsQuery } from './use-weak-sounds'

const CHART_WIDTH = 320
const CHART_HEIGHT = 120
const CHART_PADDING = 12

interface TrendSeries {
  label: string
  color: string
  points: string
  dots: readonly { x: number; y: number }[]
}

function toPoint(
  index: number,
  value: number,
  count: number,
): { x: number; y: number } {
  const innerWidth = CHART_WIDTH - CHART_PADDING * 2
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2
  const x =
    count === 1
      ? CHART_WIDTH / 2
      : CHART_PADDING + (index / (count - 1)) * innerWidth
  const y = CHART_PADDING + (1 - value / 100) * innerHeight
  return { x, y }
}

function buildSeries(
  sessions: readonly SessionListItem[],
  label: string,
  color: string,
  select: (session: SessionListItem) => number,
): TrendSeries {
  const dots = sessions.map((session, index) =>
    toPoint(index, select(session), sessions.length),
  )
  const points = dots.map((dot) => `${dot.x},${dot.y}`).join(' ')
  return { label, color, points, dots }
}

interface TrendChartProps {
  series: readonly TrendSeries[]
}

function TrendChart({ series }: TrendChartProps) {
  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-40 w-full"
        role="img"
        aria-label="Score trend across past sessions"
        preserveAspectRatio="none"
      >
        {series.map((line) => (
          <g key={line.label}>
            <polyline
              points={line.points}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {line.dots.map((dot, index) => (
              <circle
                key={index}
                cx={dot.x}
                cy={dot.y}
                r={3}
                fill={line.color}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        ))}
      </svg>
      <ul className="flex flex-wrap gap-4">
        {series.map((line) => (
          <li key={line.label} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-muted-foreground">{line.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ScoreTrendPanel() {
  const query = useSessionsQuery()

  const series = useMemo(() => {
    if (query.data === undefined) {
      return []
    }
    const ordered = [...query.data].sort((first, second) =>
      first.created_at.localeCompare(second.created_at),
    )
    return [
      buildSeries(
        ordered,
        'Accuracy',
        'var(--primary)',
        (session) => session.accuracy,
      ),
      buildSeries(
        ordered,
        'Phoneme quality',
        'var(--foreground)',
        (session) => session.phoneme_quality,
      ),
    ]
  }, [query.data])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score trend</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending && (
          <div
            className="flex items-center justify-center gap-2 py-6 text-muted-foreground"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" />
            <span>Loading trend</span>
          </div>
        )}

        {query.isError && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p role="alert" className="text-sm text-destructive">
              Could not load your trend, check the backend is running and try
              again.
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {query.isSuccess &&
          (query.data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-muted-foreground">
                No sessions yet. Score a passage to start your trend.
              </p>
              <Button asChild>
                <Link to="/">Read a passage</Link>
              </Button>
            </div>
          ) : (
            <TrendChart series={series} />
          ))}
      </CardContent>
    </Card>
  )
}

interface WeakSoundRowProps {
  weakSound: WeakSound
}

function WeakSoundRow({ weakSound }: WeakSoundRowProps) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border p-4 text-left">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-serif text-lg font-semibold">
          {weakSound.phoneme}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {weakSound.example_words.join(', ')}
        </span>
      </div>
      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
        {weakSound.occurrence_count}x
      </span>
    </li>
  )
}

function WeakSoundPanel() {
  const query = useWeakSoundsQuery()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weak sounds</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending && (
          <div
            className="flex items-center justify-center gap-2 py-6 text-muted-foreground"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" />
            <span>Loading weak sounds</span>
          </div>
        )}

        {query.isError && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p role="alert" className="text-sm text-destructive">
              Could not load your weak sounds, check the backend is running and
              try again.
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {query.isSuccess &&
          (query.data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-muted-foreground">
                No weak sounds yet. Score a passage to start tracking them.
              </p>
              <Button asChild>
                <Link to="/">Read a passage</Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {query.data.map((weakSound) => (
                <WeakSoundRow key={weakSound.phoneme} weakSound={weakSound} />
              ))}
            </ul>
          ))}
      </CardContent>
    </Card>
  )
}

export function ProgressDashboard() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Progress</h2>
        <p className="text-muted-foreground">
          Track your score trend and the sounds that need the most work.
        </p>
      </header>

      <ScoreTrendPanel />
      <WeakSoundPanel />
    </div>
  )
}
