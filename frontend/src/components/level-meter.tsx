import { cn } from '@/lib/utils'

const BARS = ['bar-1', 'bar-2', 'bar-3', 'bar-4', 'bar-5'] as const

interface LevelMeterProps {
  level: number
}

export function LevelMeter({ level }: LevelMeterProps) {
  const clamped = Math.min(1, Math.max(0, level))
  const activeBars = Math.round(clamped * BARS.length)

  return (
    <div
      role="meter"
      aria-label="Microphone input level"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number(clamped.toFixed(2))}
      className="flex h-6 items-end gap-1"
    >
      {BARS.map((bar, index) => (
        <span
          key={bar}
          className={cn(
            'w-1.5 rounded-full transition-all',
            index < activeBars ? 'bg-primary' : 'bg-muted',
          )}
          style={{ height: `${25 + index * 18}%` }}
        />
      ))}
    </div>
  )
}
