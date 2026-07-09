import {
  AudioLines,
  AudioWaveform,
  Ear,
  History,
  ListChecks,
  Mic,
  Speech,
  Target,
  TrendingUp,
  Waves,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AudioChannelProvider } from '@/features/audio-channel/audio-channel'
import { EarTraining } from '@/features/ear-training/ear-training'
import { PassageScoring } from '@/features/passage-scoring/passage-scoring'
import { ProductionDrill } from '@/features/production-drill/production-drill'
import { ProgressDashboard } from '@/features/progress-dashboard/progress-dashboard'
import { RoutineHome } from '@/features/routine/routine-home'
import { SessionHistory } from '@/features/session-history/session-history'
import { Shadowing } from '@/features/shadowing/shadowing'
import { StressIntonation } from '@/features/stress-intonation/stress-intonation'
import { TargetedDrills } from '@/features/targeted-drills/targeted-drills'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { VoicePicker } from '@/features/voice/voice-picker'
import { cn } from '@/lib/utils'

import type { HealthState } from './use-backend-health'
import { useBackendHealth } from './use-backend-health'

const STATUS_DOT: Record<HealthState, string> = {
  checking: 'bg-muted-foreground',
  ok: 'bg-success',
  error: 'bg-destructive',
}

interface BackendStatusProps {
  health: HealthState
}

function BackendStatus({ health }: BackendStatusProps) {
  return (
    <div
      className="flex items-center gap-2 text-xs text-muted-foreground"
      data-testid="backend-status"
      title={`Backend: ${health}`}
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[health])}
      />
      <span className="hidden font-mono sm:inline">Backend: {health}</span>
    </div>
  )
}

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface NavSection {
  label?: string
  items: readonly NavItem[]
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    label: 'Practice',
    items: [
      { to: '/routine', label: 'Routine', icon: ListChecks },
      { to: '/', label: 'Passage', icon: Mic },
      { to: '/shadowing', label: 'Shadowing', icon: Waves },
    ],
  },
  {
    label: 'Drills',
    items: [
      { to: '/drills', label: 'Targeted', icon: Target, end: true },
      { to: '/drills/ear-training', label: 'Ear training', icon: Ear },
      { to: '/drills/production', label: 'Production', icon: Speech },
      { to: '/drills/stress', label: 'Stress', icon: AudioWaveform },
    ],
  },
  {
    label: 'Review',
    items: [
      { to: '/history', label: 'History', icon: History },
      { to: '/progress', label: 'Progress', icon: TrendingUp },
    ],
  },
]

const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)

function matchesRoute(to: string, pathname: string): boolean {
  return to === '/' ? pathname === '/' : pathname.startsWith(to)
}

function useSectionTitle(): string {
  const { pathname } = useLocation()
  const active = NAV_ITEMS.filter((item) =>
    matchesRoute(item.to, pathname),
  ).sort((first, second) => second.to.length - first.to.length)[0]
  return active?.label ?? 'Passage'
}

function ViewNav() {
  return (
    <nav aria-label="Views" className="flex flex-col gap-2">
      {NAV_SECTIONS.map((section) => (
        <SidebarGroup key={section.label ?? section.items[0].to}>
          {section.label ? (
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    className="aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground"
                  >
                    <NavLink to={item.to} end={item.end ?? item.to === '/'}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  )
}

function SectionTitle() {
  const title = useSectionTitle()

  return <span className="font-medium">{title}</span>
}

export function App() {
  const health = useBackendHealth()

  return (
    <AudioChannelProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <AudioLines className="size-5 shrink-0 text-primary" />
              <h1 className="font-serif text-lg font-semibold group-data-[collapsible=icon]:hidden">
                Diction
              </h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <ViewNav />
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <SectionTitle />
            <div className="ml-auto flex items-center gap-3">
              <BackendStatus health={health} />
              <VoicePicker />
              <ThemeToggle />
            </div>
          </header>
          <Routes>
            <Route path="/" element={<PassageScoring />} />
            <Route path="/routine" element={<RoutineHome />} />
            <Route path="/shadowing" element={<Shadowing />} />
            <Route path="/drills" element={<TargetedDrills />} />
            <Route path="/drills/ear-training" element={<EarTraining />} />
            <Route path="/drills/production" element={<ProductionDrill />} />
            <Route path="/drills/stress" element={<StressIntonation />} />
            <Route path="/history" element={<SessionHistory />} />
            <Route path="/history/:sessionId" element={<SessionHistory />} />
            <Route path="/progress" element={<ProgressDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SidebarInset>
      </SidebarProvider>
    </AudioChannelProvider>
  )
}
