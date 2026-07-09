import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { phonemeSearch } from '@/lib/phoneme-search'

import type { RoutineStep } from './routine-step'
import { useRoutine } from './use-routine'

interface RoutineStepCardProps {
  step: RoutineStep
  position: number
}

function RoutineStepCard({ step, position }: RoutineStepCardProps) {
  const { mode, phoneme, contrast, reason } = step
  const Icon = mode.icon
  const focus = contrast ? contrast.label : phoneme
  const to =
    mode.acceptsPhoneme && phoneme
      ? { pathname: mode.route, search: phonemeSearch(phoneme) }
      : { pathname: mode.route }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium tabular-nums text-muted-foreground">
            {position}
          </span>
          <Icon className="size-5 shrink-0 text-primary" />
          <span>{mode.label}</span>
          <span className="ml-auto shrink-0 text-sm font-normal text-muted-foreground">
            {reason}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {focus && (
          <p className="truncate text-sm text-muted-foreground">
            Focus on {focus}
          </p>
        )}
        <Button asChild className="self-start">
          <Link to={to}>
            <Icon />
            Start
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function RoutineHome() {
  const { steps, isPending, isError, isSuccess, refetch } = useRoutine()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Today's routine</h2>
        <p className="text-muted-foreground">
          A short rotation for this sitting, due sounds first.
        </p>
      </header>

      {isPending && (
        <div
          className="flex items-center justify-center gap-2 py-6 text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" />
          <span>Loading routine</span>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            Could not load your routine, check the backend is running and try
            again.
          </p>
          <Button variant="outline" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}

      {isSuccess && (
        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={`${step.mode.id}-${step.phoneme ?? 'fixed'}-${index}`}>
              <RoutineStepCard step={step} position={index + 1} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
