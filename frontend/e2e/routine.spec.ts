import { expect, type Page, test } from '@playwright/test'

const RESURFACING_URL = '**/api/resurfacing'
const WEAK_SOUNDS_URL = '**/api/weak-sounds'
const MINIMAL_PAIRS_URL = '**/api/minimal-pairs'

const MOCK_CONTRASTS = [
  {
    phoneme_a: 'ɹ',
    phoneme_b: 'l',
    label: 'r vs l',
    pairs: [{ word_a: 'road', word_b: 'load' }],
  },
]

const MOCK_WEAK_SOUNDS = [
  {
    phoneme: 'ɹ',
    occurrence_count: 8,
    word_count: 1,
    example_words: ['red'],
    first_seen: '2026-06-28T07:41:00Z',
    last_seen: '2026-07-02T09:14:00Z',
  },
]

function dueSound(phoneme: string, isDue: boolean) {
  return {
    phoneme,
    box: 0,
    interval_days: 1,
    last_practiced: '2026-07-01T09:14:00Z',
    next_due: '2026-07-02T09:14:00Z',
    is_due: isDue,
    example_words: ['red'],
  }
}

async function openRoutine(page: Page, dueSounds: unknown[]): Promise<void> {
  await page.route(RESURFACING_URL, (route) =>
    route.fulfill({ json: dueSounds }),
  )
  await page.route(WEAK_SOUNDS_URL, (route) =>
    route.fulfill({ json: MOCK_WEAK_SOUNDS }),
  )
  await page.route(MINIMAL_PAIRS_URL, (route) =>
    route.fulfill({ json: MOCK_CONTRASTS }),
  )
  await page.goto('/routine')
}

test.describe('routine', () => {
  test('should list ordered steps and route a step into its mode with the phoneme param', async ({
    page,
  }) => {
    await openRoutine(page, [dueSound('ɹ', true)])

    await expect(page.getByText('Due for review')).toBeVisible()

    const start = page.getByRole('main').getByRole('link', { name: 'Start' })
    await expect(start.first()).toHaveAttribute(
      'href',
      `/drills/production?phoneme=${encodeURIComponent('ɹ')}`,
    )

    await start.first().click()
    await expect(page).toHaveURL(/\/drills\/production\?phoneme=/)
  })
})
