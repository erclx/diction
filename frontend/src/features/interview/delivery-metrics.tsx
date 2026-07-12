import { MetricCard } from '@/components/metric-card'

import type { CvReport } from './interview-result'

interface DeliveryMetricsProps {
  cv: CvReport
}

export function DeliveryMetrics({ cv }: DeliveryMetricsProps) {
  return (
    <section className="flex flex-col gap-3" aria-label="Delivery">
      <h3 className="text-left text-xl font-medium">Delivery</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Eye contact"
          display={`${Math.round(cv.eye_contact.looking_pct)}%`}
          caveat="Share of the answer you looked toward the lens. A directional read, not a settled grade."
        />
        <MetricCard
          label="Stability"
          display={cv.posture.stability.toFixed(2)}
          caveat="How steady your posture held, from 0 to 1. A directional read, not a settled grade."
        />
        <MetricCard
          label="Gesture ratio"
          display={cv.posture.gesture_ratio.toFixed(2)}
          caveat="How much you gestured while speaking, from 0 to 1. A directional read, not a settled grade."
        />
        <MetricCard
          label="Shoulder tilt"
          display={`${Math.round(cv.posture.shoulder_tilt_deg)}°`}
          caveat="Lateral lean of your shoulders in degrees. 0 is level. A directional read, not a settled grade."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Posture and eye-contact signals from the video, while the delivery
        scorer is still being calibrated. Read them as directional, not a grade.
      </p>
    </section>
  )
}
