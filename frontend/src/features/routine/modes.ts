import { AudioWaveform, Ear, Mic, Speech, Waves } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type RoutineModeId =
  | 'passage'
  | 'shadowing'
  | 'ear-training'
  | 'production'
  | 'stress'

export interface RoutineMode {
  id: RoutineModeId
  label: string
  icon: LucideIcon
  route: string
  acceptsPhoneme: boolean
}

export const ROUTINE_MODES: Record<RoutineModeId, RoutineMode> = {
  passage: {
    id: 'passage',
    label: 'Passage',
    icon: Mic,
    route: '/',
    acceptsPhoneme: false,
  },
  shadowing: {
    id: 'shadowing',
    label: 'Shadowing',
    icon: Waves,
    route: '/shadowing',
    acceptsPhoneme: false,
  },
  'ear-training': {
    id: 'ear-training',
    label: 'Ear training',
    icon: Ear,
    route: '/drills/ear-training',
    acceptsPhoneme: true,
  },
  production: {
    id: 'production',
    label: 'Production',
    icon: Speech,
    route: '/drills/production',
    acceptsPhoneme: true,
  },
  stress: {
    id: 'stress',
    label: 'Stress',
    icon: AudioWaveform,
    route: '/drills/stress',
    acceptsPhoneme: false,
  },
}
