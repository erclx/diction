import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { SessionHistory } from './session-history'

describe('SessionHistory', () => {
  it('should render the session list when no session is selected', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/history" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history'] },
    )

    expect(await screen.findByText('92.2')).toBeInTheDocument()
    expect(screen.queryByText('Completeness')).not.toBeInTheDocument()
  })

  it('should render the session detail from the route param', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/history/:sessionId" element={<SessionHistory />} />
      </Routes>,
      { initialEntries: ['/history/12'] },
    )

    expect(await screen.findByText('Completeness')).toBeInTheDocument()
    expect(screen.getByText('thought', { exact: true })).toBeInTheDocument()
  })
})
