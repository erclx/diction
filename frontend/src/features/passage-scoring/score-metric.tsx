import { MetricCard } from '@/components/metric-card'
import { cn } from '@/lib/utils'

interface ScoreMetricProps {
  label: string
  value: number
  caveat?: string
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

export function ScoreMetric({ label, value, caveat }: ScoreMetricProps) {
  return (
    <MetricCard
      label={label}
      display={value.toFixed(1)}
      valueClassName={cn(toneClass(value))}
      caveat={caveat}
    />
  )
}
