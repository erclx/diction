import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface ScoreMetricProps {
  label: string
  value: number
}

function toneClass(value: number): string {
  if (value >= 90) {
    return 'text-success'
  }
  if (value >= 75) {
    return 'text-warning'
  }
  return 'text-destructive'
}

export function ScoreMetric({ label, value }: ScoreMetricProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 p-4">
        <span
          className={cn(
            'text-2xl font-semibold tabular-nums',
            toneClass(value),
          )}
        >
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  )
}
