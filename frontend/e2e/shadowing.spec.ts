import { expect, type Page, test } from '@playwright/test'

const SCORE_URL = '**/api/prosody/score'
const REFERENCE_URL = '**/api/reference*'
const GENERATE_URL = '**/api/content/generate'

const WAV_BYTES = Buffer.from([82, 73, 70, 70])

const MOCK_SCORE = { rhythm_match: 88, intonation_match: 84 }
const GENERATED_LINE = 'A freshly generated shadowing line to repeat.'

async function recordAndScore(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: 'Score' }).click()
}

test.describe('shadowing', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'mic capture relies on chromium fake media',
  )

  test.beforeEach(async ({ page }) => {
    await page.route(REFERENCE_URL, (route) =>
      route.fulfill({ contentType: 'audio/wav', body: WAV_BYTES }),
    )
    await page.route(SCORE_URL, (route) => route.fulfill({ json: MOCK_SCORE }))
  })

  test('should play the native line, record a repeat, and show match scores', async ({
    page,
  }) => {
    await page.goto('/shadowing')

    const reference = page.waitForRequest((candidate) =>
      candidate.url().includes('/api/reference'),
    )
    await page
      .getByRole('button', { name: 'Play native reference for this line' })
      .click()
    await reference

    await recordAndScore(page)

    await expect(page.getByText('Rhythm match')).toBeVisible()
    await expect(page.getByText('Intonation match')).toBeVisible()
    await expect(page.getByText(/directional read/)).toBeVisible()
  })

  test('should generate a line and play it through the reference route', async ({
    page,
  }) => {
    await page.route(GENERATE_URL, (route) =>
      route.fulfill({ json: { text: GENERATED_LINE } }),
    )
    await page.goto('/shadowing')

    await page.getByRole('button', { name: 'Generate a line' }).click()
    await expect(page.getByText(GENERATED_LINE)).toBeVisible()

    const reference = page.waitForRequest((candidate) =>
      candidate.url().includes('/api/reference'),
    )
    await page
      .getByRole('button', { name: 'Play native reference for this line' })
      .click()
    const request = await reference

    expect(new URL(request.url()).searchParams.get('text')).toBe(GENERATED_LINE)
  })

  test('should advance to the next line after scoring', async ({ page }) => {
    await page.goto('/shadowing')

    await recordAndScore(page)
    await expect(page.getByText('Rhythm match')).toBeVisible()

    await page.getByRole('button', { name: 'Next line' }).click()

    await expect(
      page.getByRole('button', { name: 'Record', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Rhythm match')).toBeHidden()
  })
})
