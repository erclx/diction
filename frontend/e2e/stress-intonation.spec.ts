import { expect, type Page, test } from '@playwright/test'

const ANALYZE_URL = '**/api/prosody/analyze'
const REFERENCE_URL = '**/api/reference*'
const GENERATE_URL = '**/api/content/generate'

const WAV_BYTES = Buffer.from([82, 73, 70, 70])
const GENERATED_LINE = 'I never claimed she took the change.'

const MOCK_ANALYSIS = {
  rhythm_match: 88,
  intonation_match: 84,
  reference_contour: [0, 1.5, 3, 1, -1, -2.5, -1, 0.5],
  learner_contour: [0, 1, 2, 0.5, -0.5, -1.5, -0.5, 0],
  reference_timings: [
    [0, 0.3],
    [0.3, 0.7],
    [0.7, 1.4],
  ],
  stress_marks: [
    { word: 'the', syllables: ['ðə'], stress_index: 0 },
    { word: 'banana', syllables: ['bə', 'nɑː', 'nə'], stress_index: 1 },
  ],
}

async function recordAndAnalyze(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: 'Analyze' }).click()
}

test.describe('stress and intonation', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'mic capture relies on chromium fake media',
  )

  test.beforeEach(async ({ page }) => {
    await page.route(REFERENCE_URL, (route) =>
      route.fulfill({ contentType: 'audio/wav', body: WAV_BYTES }),
    )
    await page.route(ANALYZE_URL, (route) =>
      route.fulfill({ json: MOCK_ANALYSIS }),
    )
  })

  test('should draw the contour, mark stress, and show match scores', async ({
    page,
  }) => {
    await page.goto('/drills/stress')

    await recordAndAnalyze(page)

    await expect(page.getByRole('img', { name: /pitch contour/ })).toBeVisible()
    await expect(page.getByTestId('word-boundary')).toHaveCount(
      MOCK_ANALYSIS.reference_timings.length - 1,
    )
    await expect(page.getByText('nɑː')).toBeVisible()
    await expect(page.getByText('Rhythm match')).toBeVisible()
    await expect(page.getByText('Intonation match')).toBeVisible()
    await expect(page.getByText(/directional read/)).toBeVisible()
  })

  test('should generate a line and analyze it against the reference', async ({
    page,
  }) => {
    await page.route(GENERATE_URL, (route) =>
      route.fulfill({ json: { text: GENERATED_LINE } }),
    )
    await page.goto('/drills/stress')

    await page.getByRole('button', { name: 'Generate a line' }).click()
    await expect(page.getByText(GENERATED_LINE)).toBeVisible()

    const analyze = page.waitForRequest((candidate) =>
      candidate.url().includes('/api/prosody/analyze'),
    )
    await recordAndAnalyze(page)
    const request = await analyze

    expect(request.postData()).toContain(GENERATED_LINE)
    await expect(page.getByText('Rhythm match')).toBeVisible()
  })

  test('should advance to the next line after analyzing', async ({ page }) => {
    await page.goto('/drills/stress')

    await recordAndAnalyze(page)
    await expect(page.getByText('Rhythm match')).toBeVisible()

    await page.getByRole('button', { name: 'Next line' }).click()

    await expect(
      page.getByRole('button', { name: 'Record', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Rhythm match')).toBeHidden()
  })
})
