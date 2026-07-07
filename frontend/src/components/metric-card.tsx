import { Info } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export const DIRECTIONAL_CAVEAT =
  'Scored 0 to 100. A directional read, not a settled grade.'

interface MetricCardProps {
  label: string
  display: string
  valueClassName?: string
  caveat?: string
}

export function MetricCard({
  label,
  display,
  valueClassName,
  caveat = DIRECTIONAL_CAVEAT,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 p-4">
        <span
          className={cn('text-2xl font-semibold tabular-nums', valueClassName)}
        >
          {display}
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {label}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                type="button"
                aria-label={`About the ${label} score`}
                className="rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-52 text-center">
                {caveat}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      </CardContent>
    </Card>
  )
}
