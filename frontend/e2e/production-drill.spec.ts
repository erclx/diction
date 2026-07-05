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

const WORD_SCORE = { phoneme_quality: 72 }

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

  test('should show the sound quality score and advance to the next word', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) => route.fulfill({ json: WORD_SCORE }))
    await page.goto('/drills/production')

    await recordClip(page)
    await page.getByRole('button', { name: 'Check' }).click()

    await expect(page.getByRole('status')).toContainText('72')

    await page.getByRole('button', { name: 'Next word' }).click()

    await expect(
      page.getByRole('button', { name: 'Record', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('status')).toBeHidden()
  })

  test('should let the user re-record the same word with try again', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) => route.fulfill({ json: WORD_SCORE }))
    await page.goto('/drills/production')

    await recordClip(page)
    await page.getByRole('button', { name: 'Check' }).click()

    await expect(page.getByRole('status')).toContainText('72')

    await page.getByRole('button', { name: 'Try again' }).click()

    await expect(
      page.getByRole('button', { name: 'Record', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('status')).toBeHidden()
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
