import { expect, test } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Diction' })).toBeVisible()
})

test('reports backend health', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('backend-status')).toHaveText('Backend: ok')
})

test('navigates between surfaces from the sidebar', async ({ page }) => {
  await page.goto('/')

  const nav = page.getByRole('navigation', { name: 'Views' })

  await nav.getByRole('link', { name: 'Progress' }).click()

  await expect(page).toHaveURL(/\/progress$/)
  await expect(nav.getByRole('link', { name: 'Progress' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await nav.getByRole('link', { name: 'Passage' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(nav.getByRole('link', { name: 'Passage' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('opens the sidebar drawer on mobile to navigate', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Progress' })).toBeHidden()

  await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  await page.getByRole('link', { name: 'Progress' }).click()

  await expect(page).toHaveURL(/\/progress$/)
})
