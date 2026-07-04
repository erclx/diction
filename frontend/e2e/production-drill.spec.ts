import { expect, type Page, test } from '@playwright/test'

const PAIRS_URL = '**/api/minimal-pairs'
const SCORE_URL = '**/api/drills/minimal-pair/score'

const MOCK_PAIRS = [
  {
    phoneme_a: 'ɔ',
    phoneme_b: 'ɒ',
    label: 'walk vs wok',
    pairs: [{ word_a: 'walk', word_b: 'wok' }],
  },
]

const FLAGGED_SCORE = {
  flagged_words: [
    {
      word: 'walk',
      start: 0.1,
      end: 0.5,
      phoneme: 'ɔ',
      explanation: 'Round the vowel more.',
    },
  ],
}

async function recordClip(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Check' })).toBeVisible()
}

test.describe('production drill', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'mic capture relies on chromium fake media',
  )

  test.beforeEach(async ({ page }) => {
    await page.route(PAIRS_URL, (route) => route.fulfill({ json: MOCK_PAIRS }))
  })

  test('should pass and advance to the next word when the sound lands', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) =>
      route.fulfill({ json: { flagged_words: [] } }),
    )
    await page.goto('/drills/production')

    await recordClip(page)
    await page.getByRole('button', { name: 'Check' }).click()

    await expect(page.getByRole('status')).toContainText('landed')

    await page.getByRole('button', { name: 'Next word' }).click()

    await expect(
      page.getByRole('button', { name: 'Record', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('status')).toBeHidden()
  })

  test('should prompt a retry when the target sound is flagged', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) =>
      route.fulfill({ json: FLAGGED_SCORE }),
    )
    await page.goto('/drills/production')

    await recordClip(page)
    await page.getByRole('button', { name: 'Check' }).click()

    await expect(page.getByRole('status')).toContainText('Not quite')
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
    await page.goto('/drills/production')

    await recordClip(page)
    await page.getByRole('button', { name: 'Check' }).click()

    await expect(page.getByRole('alert')).toContainText('too short or quiet')
  })
})
