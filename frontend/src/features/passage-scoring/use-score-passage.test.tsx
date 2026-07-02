import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/server'

import { ClipTooWeakError, useScorePassage } from './use-score-passage'

const SCORE_URL = 'http://localhost:8000/api/passages/score'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

const input = {
  passage: 'hello world',
  audio: new Blob(['clip'], { type: 'audio/webm' }),
}

describe('useScorePassage', () => {
  it('should return the parsed score set on success', async () => {
    const { result } = renderHook(() => useScorePassage(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.accuracy).toBe(92.2)
    expect(result.current.data?.flagged_words[0].phoneme).toBe('θ')
  })

  it('should raise ClipTooWeakError when the clip is rejected as too weak', async () => {
    server.use(
      http.post(SCORE_URL, () =>
        HttpResponse.json(
          {
            error: 'clip_too_weak',
            detail: 'duration=0.4s below 1.0s minimum',
          },
          { status: 422 },
        ),
      ),
    )
    const { result } = renderHook(() => useScorePassage(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ClipTooWeakError)
  })

  it('should raise a generic error when scoring fails', async () => {
    server.use(
      http.post(SCORE_URL, () => new HttpResponse(null, { status: 500 })),
    )
    const { result } = renderHook(() => useScorePassage(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).not.toBeInstanceOf(ClipTooWeakError)
  })
})
