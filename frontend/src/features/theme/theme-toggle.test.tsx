import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ThemeToggle } from './theme-toggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  it('should default to the system theme with no stored preference', () => {
    render(<ThemeToggle />)

    expect(
      screen.getByRole('button', { name: /system theme/i }),
    ).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('should cycle light then dark then system on click', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button'))
    expect(
      screen.getByRole('button', { name: /light theme/i }),
    ).toBeInTheDocument()
    expect(document.documentElement.classList.contains('light')).toBe(true)

    await user.click(screen.getByRole('button'))
    expect(
      screen.getByRole('button', { name: /dark theme/i }),
    ).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await user.click(screen.getByRole('button'))
    expect(
      screen.getByRole('button', { name: /system theme/i }),
    ).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should persist the selected theme to localStorage', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button'))

    expect(localStorage.getItem('diction-theme')).toBe('light')
  })

  it('should restore a stored dark preference on mount', () => {
    localStorage.setItem('diction-theme', 'dark')

    render(<ThemeToggle />)

    expect(
      screen.getByRole('button', { name: /dark theme/i }),
    ).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
