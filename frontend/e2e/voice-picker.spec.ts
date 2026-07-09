import { expect, type Page, test } from '@playwright/test'

const WAV_BYTES = Buffer.from([82, 73, 70, 70])

const VOICES = {
  voices: [
    { id: 'af_heart', label: 'Heart', accent: 'American', gender: 'Female' },
    { id: 'am_michael', label: 'Michael', accent: 'American', gender: 'Male' },
    { id: 'bf_emma', label: 'Emma', accent: 'British', gender: 'Female' },
  ],
  default: 'af_heart',
}

async function stubVoiceRoutes(page: Page): Promise<void> {
  await page.route('**/api/voices', (route) => route.fulfill({ json: VOICES }))
  await page.route('**/api/reference*', (route) =>
    route.fulfill({ contentType: 'audio/wav', body: WAV_BYTES }),
  )
}

async function pickVoice(page: Page, name: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Reference voice' }).click()
  await page.getByRole('option', { name }).click()
}

test.describe('voice picker', () => {
  test('should offer the reference voices in the shell', async ({ page }) => {
    await stubVoiceRoutes(page)
    await page.goto('/')

    await page.getByRole('combobox', { name: 'Reference voice' }).click()
    await expect(
      page.getByRole('option', { name: 'Michael (Male)' }),
    ).toBeVisible()
    await expect(
      page.getByRole('option', { name: 'Emma (Female)' }),
    ).toBeVisible()
  })

  test('should send the picked voice with the passage reference request', async ({
    page,
  }) => {
    await stubVoiceRoutes(page)
    await page.goto('/')

    await pickVoice(page, 'Michael (Male)')

    const request = page.waitForRequest((candidate) =>
      candidate.url().includes('/api/reference'),
    )
    await page
      .getByRole('button', { name: 'Play native reference for the passage' })
      .click()

    expect((await request).url()).toContain('voice=am_michael')
  })
})
