import { expect, type Page, test } from '@playwright/test'

const SCORE_URL = '**/api/passages/score'

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

async function recordClip(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Score' })).toBeVisible()
}

test.describe('passage scoring', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'mic capture relies on chromium fake media',
  )

  test('should show a live input meter only while recording', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('meter', { name: 'Microphone input level' }),
    ).toBeHidden()

    await page.getByRole('button', { name: 'Record', exact: true }).click()
    await expect(
      page.getByRole('meter', { name: 'Microphone input level' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(
      page.getByRole('meter', { name: 'Microphone input level' }),
    ).toBeHidden()
  })

  test('should show metrics and a flagged word after scoring', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) => route.fulfill({ json: MOCK_SCORE }))
    await page.goto('/')

    await recordClip(page)
    await page.getByRole('button', { name: 'Score' }).click()

    await expect(page.getByText('Accuracy')).toBeVisible()
    await expect(page.getByText('92.2')).toBeVisible()
    await expect(page.getByText('thought', { exact: true })).toBeVisible()
  })

  test('should prompt a re-record when the clip is too weak', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) =>
      route.fulfill({
        status: 422,
        json: { error: 'clip_too_weak', detail: 'too short' },
      }),
    )
    await page.goto('/')

    await recordClip(page)
    await page.getByRole('button', { name: 'Score' }).click()

    await expect(page.getByRole('alert')).toContainText('too short or quiet')
  })

  test('should show a generic error when scoring fails', async ({ page }) => {
    await page.route(SCORE_URL, (route) => route.fulfill({ status: 500 }))
    await page.goto('/')

    await recordClip(page)
    await page.getByRole('button', { name: 'Score' }).click()

    await expect(page.getByRole('alert')).toContainText('Scoring failed')
  })

  test('should score a typed custom passage against itself', async ({
    page,
  }) => {
    const customPassage = 'Please call Stella and ask her to bring these.'
    let scoredPassage: string | null = null
    await page.route(SCORE_URL, async (route) => {
      scoredPassage = route.request().postDataBuffer()?.toString('utf8') ?? null
      await route.fulfill({ json: MOCK_SCORE })
    })
    await page.goto('/')

    const input = page.getByLabel('Passage to read')
    await input.fill(customPassage)
    await recordClip(page)
    await page.getByRole('button', { name: 'Score' }).click()

    await expect(page.getByText('Accuracy')).toBeVisible()
    expect(scoredPassage).toContain(customPassage)
  })

  test('should block recording when the passage is emptied', async ({
    page,
  }) => {
    await page.goto('/')

    await page.getByLabel('Passage to read').fill('   ')

    await expect(
      page.getByRole('button', { name: 'Record', exact: true }),
    ).toBeDisabled()
    await expect(page.getByText('Enter some text to practice')).toBeVisible()
  })

  test('should reset to the record prompt after record again', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) => route.fulfill({ json: MOCK_SCORE }))
    await page.goto('/')

    await recordClip(page)
    await page.getByRole('button', { name: 'Score' }).click()
    await expect(page.getByText('Flagged words')).toBeVisible()

    await page.getByRole('button', { name: 'Record again' }).click()

    await expect(
      page.getByRole('button', { name: 'Record', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Flagged words')).toBeHidden()
  })
})
