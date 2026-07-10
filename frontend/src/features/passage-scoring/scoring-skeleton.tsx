import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const METRIC_KEYS = [
  'completeness',
  'accuracy',
  'fluency',
  'phoneme_quality',
] as const

const FLAGGED_ROW_KEYS = ['first', 'second'] as const

export function ScoringSkeleton() {
  return (
    <section
      className="flex flex-col gap-6"
      role="status"
      aria-label="Scoring in progress"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRIC_KEYS.map((key) => (
          <Card key={key}>
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-left text-xl font-medium">Flagged words</h3>
        <div className="flex flex-col gap-3">
          {FLAGGED_ROW_KEYS.map((key) => (
            <div
              key={key}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <div className="flex gap-2">
                <Skeleton className="size-9" />
                <Skeleton className="size-9" />
              </div>
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
