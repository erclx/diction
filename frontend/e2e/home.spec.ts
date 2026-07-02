import { expect, test } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Diction' })).toBeVisible()
})

test('reports backend health', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('backend-status')).toHaveText('Backend: ok')
})
