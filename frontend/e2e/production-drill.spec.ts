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

const PASS_SCORE = {
  said_expected_word: true,
  phoneme_quality: 82,
  flagged_phonemes: [],
}
const RETRY_SCORE = {
  said_expected_word: true,
  phoneme_quality: 41,
  flagged_phonemes: ['ɔ'],
}
const UNRECOGNIZED_SCORE = {
  said_expected_word: false,
  phoneme_quality: 0,
  flagged_phonemes: [],
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

  test('should show a pass verdict and advance to the next word', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) => route.fulfill({ json: PASS_SCORE }))
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

  test('should show a retry verdict and let the user try the word again', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) => route.fulfill({ json: RETRY_SCORE }))
    await page.goto('/drills/production')

    await recordClip(page)
    await page.getByRole('button', { name: 'Check' }).click()

    await expect(page.getByRole('status')).toContainText('try')

    await page.getByRole('button', { name: 'Try again' }).click()

    await expect(
      page.getByRole('button', { name: 'Record', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('status')).toBeHidden()
  })

  test('should prompt to say it again when the word was not recognized', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) =>
      route.fulfill({ json: UNRECOGNIZED_SCORE }),
    )
    await page.goto('/drills/production')

    await recordClip(page)
    await page.getByRole('button', { name: 'Check' }).click()

    await expect(page.getByRole('status')).toContainText('Didn’t catch')
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
