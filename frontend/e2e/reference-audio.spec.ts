import { expect, type Page, test } from '@playwright/test'

const SCORE_URL = '**/api/passages/score'
const REFERENCE_URL = '**/api/reference*'

const WAV_BYTES = Buffer.from([82, 73, 70, 70])

const MOCK_SCORE = {
  completeness: 90.9,
  accuracy: 92.2,
  fluency: 98,
  phoneme_quality: 94,
  flagged_words: [
    {
      word: 'thought',
      start: 0.1,
      end: 0.3,
      phoneme: 'θ',
      explanation: 'Say th, not t.',
    },
  ],
}

async function fulfillReference(page: Page): Promise<void> {
  await page.route(REFERENCE_URL, (route) =>
    route.fulfill({ contentType: 'audio/wav', body: WAV_BYTES }),
  )
}

async function recordAndScore(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: 'Score' }).click()
}

test.describe('reference audio', () => {
  test('should request native reference for the passage when its button is clicked', async ({
    page,
  }) => {
    await fulfillReference(page)
    await page.goto('/')

    const button = page.getByRole('button', {
      name: 'Play native reference for the passage',
    })
    await expect(button).toBeVisible()

    const request = page.waitForRequest((candidate) =>
      candidate.url().includes('/api/reference'),
    )
    await button.click()

    expect((await request).url()).toContain('quick')
  })

  test('should offer a native reference on a flagged word after scoring', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'mic capture relies on chromium fake media',
    )
    await page.route(SCORE_URL, (route) => route.fulfill({ json: MOCK_SCORE }))
    await fulfillReference(page)
    await page.goto('/')

    await recordAndScore(page)
    await expect(page.getByText('thought', { exact: true })).toBeVisible()

    const button = page.getByRole('button', {
      name: 'Play native reference for thought',
    })
    await expect(button).toBeVisible()

    const request = page.waitForRequest((candidate) =>
      candidate.url().includes('/api/reference'),
    )
    await button.click()

    expect(decodeURIComponent((await request).url())).toContain('text=thought')
  })
})
