import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { formatSessionDate } from './format'
import type { SessionListItem } from './session'
import { useSessionsQuery } from './use-sessions'

function accuracyTone(value: number): string {
  if (value >= 90) {
    return 'text-success'
  }
  if (value >= 75) {
    return 'text-warning'
  }
  return 'text-destructive'
}

interface SessionRowProps {
  session: SessionListItem
}

function SessionRow({ session }: SessionRowProps) {
  return (
    <li>
      <Link
        to={`/history/${session.id}`}
        className="flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex flex-col gap-1">
          <span className="font-medium">
            {formatSessionDate(session.created_at)}
          </span>
          <span className="text-sm capitalize text-muted-foreground">
            {session.mode}
          </span>
        </div>
        <span
          className={cn(
            'text-2xl font-semibold tabular-nums',
            accuracyTone(session.accuracy),
          )}
        >
          {session.accuracy.toFixed(1)}
        </span>
      </Link>
    </li>
  )
}

export function SessionList() {
  const query = useSessionsQuery()

  if (query.isPending) {
    return (
      <div
        className="flex items-center justify-center gap-2 p-8 text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-4 animate-spin" />
        <span>Loading sessions</span>
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p role="alert" className="text-sm text-destructive">
          Could not load your history, check the backend is running and try
          again.
        </p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (query.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-muted-foreground">
          No sessions yet. Score a passage to start your history.
        </p>
        <Button asChild>
          <Link to="/">Read a passage</Link>
        </Button>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {query.data.map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </ul>
  )
}
