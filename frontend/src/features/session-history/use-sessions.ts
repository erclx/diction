import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { BACKEND_URL } from '@/config'

import type { SessionDetail, SessionListItem } from './session'
import { SessionDetailSchema, SessionListSchema } from './session'

const SESSIONS_TIMEOUT_MS = 10_000
const SESSIONS_STALE_MS = 30_000

export class SessionNotFoundError extends Error {
  constructor() {
    super('session_not_found')
    this.name = 'SessionNotFoundError'
  }
}

const sessionsKey = ['sessions'] as const
const sessionKey = (id: number) => ['sessions', id] as const

async function fetchSessions(): Promise<SessionListItem[]> {
  const response = await fetch(`${BACKEND_URL}/api/sessions`, {
    signal: AbortSignal.timeout(SESSIONS_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Failed to load sessions with status ${response.status}`)
  }

  return SessionListSchema.parse(await response.json())
}

async function fetchSession(id: number): Promise<SessionDetail> {
  const response = await fetch(`${BACKEND_URL}/api/sessions/${id}`, {
    signal: AbortSignal.timeout(SESSIONS_TIMEOUT_MS),
  })

  if (response.status === 404) {
    throw new SessionNotFoundError()
  }

  if (!response.ok) {
    throw new Error(`Failed to load session with status ${response.status}`)
  }

  return SessionDetailSchema.parse(await response.json())
}

export function useSessionsQuery() {
  return useQuery({
    queryKey: sessionsKey,
    queryFn: fetchSessions,
    staleTime: SESSIONS_STALE_MS,
    retry: false,
  })
}

async function deleteSession(id: number): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/sessions/${id}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(SESSIONS_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Failed to delete session with status ${response.status}`)
  }
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: sessionKey(id) })
      return queryClient.invalidateQueries({ queryKey: sessionsKey })
    },
  })
}

export function useSessionQuery(id: number | null) {
  return useQuery({
    queryKey: sessionKey(id ?? 0),
    queryFn: () => fetchSession(id as number),
    enabled: id !== null,
    staleTime: SESSIONS_STALE_MS,
    retry: (failureCount, error) =>
      !(error instanceof SessionNotFoundError) && failureCount < 2,
  })
}
