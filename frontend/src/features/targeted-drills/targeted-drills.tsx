import { Ear, Loader2, Speech } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { SuggestedDrill } from './use-suggested-drills'
import { useSuggestedDrills } from './use-suggested-drills'

function drillSearch(phoneme: string): string {
  return `?phoneme=${encodeURIComponent(phoneme)}`
}

interface SuggestedDrillCardProps {
  drill: SuggestedDrill
}

function SuggestedDrillCard({ drill }: SuggestedDrillCardProps) {
  const { contrast } = drill

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span>{contrast ? contrast.label : drill.phoneme}</span>
          <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
            {drill.badge}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {drill.exampleWords.length > 0 && (
          <p className="truncate text-sm text-muted-foreground">
            Missed in {drill.exampleWords.join(', ')}
          </p>
        )}

        {contrast ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link
                to={{
                  pathname: '/drills/ear-training',
                  search: drillSearch(drill.phoneme),
                }}
              >
                <Ear />
                Ear training
              </Link>
            </Button>
            <Button asChild>
              <Link
                to={{
                  pathname: '/drills/production',
                  search: drillSearch(drill.phoneme),
                }}
              >
                <Speech />
                Production
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No drill for this sound yet. It will show up here once a matching
            pair is added.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function TargetedDrills() {
  const { suggestions, isPending, isError, isSuccess, refetch } =
    useSuggestedDrills()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Targeted drills</h2>
        <p className="text-muted-foreground">
          Review the sounds that are due, then the ones you miss most.
        </p>
      </header>

      {isPending && (
        <div
          className="flex items-center justify-center gap-2 py-6 text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" />
          <span>Loading drills</span>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            Could not load your drills, check the backend is running and try
            again.
          </p>
          <Button variant="outline" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}

      {isSuccess &&
        (suggestions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-muted-foreground">
                No weak sounds yet. Score a passage and your trouble sounds will
                show up here to drill.
              </p>
              <Button asChild>
                <Link to="/">Read a passage</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {suggestions.map((drill) => (
              <SuggestedDrillCard key={drill.phoneme} drill={drill} />
            ))}
          </div>
        ))}
    </div>
  )
}
