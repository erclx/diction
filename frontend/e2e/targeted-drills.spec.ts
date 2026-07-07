import { expect, type Page, test } from '@playwright/test'

const RESURFACING_URL = '**/api/resurfacing'
const WEAK_SOUNDS_URL = '**/api/weak-sounds'
const MINIMAL_PAIRS_URL = '**/api/minimal-pairs'

const MOCK_CONTRASTS = [
  {
    phoneme_a: 'θ',
    phoneme_b: 'f',
    label: 'th vs f',
    pairs: [{ word_a: 'thin', word_b: 'fin' }],
  },
  {
    phoneme_a: 'ɹ',
    phoneme_b: 'l',
    label: 'r vs l',
    pairs: [{ word_a: 'road', word_b: 'load' }],
  },
]

const MOCK_WEAK_SOUNDS = [
  {
    phoneme: 'θ',
    occurrence_count: 8,
    word_count: 1,
    example_words: ['thought'],
    first_seen: '2026-06-28T07:41:00Z',
    last_seen: '2026-07-02T09:14:00Z',
  },
]

function dueSound(phoneme: string, isDue: boolean, exampleWords: string[]) {
  return {
    phoneme,
    box: 0,
    interval_days: 1,
    last_practiced: '2026-07-01T09:14:00Z',
    next_due: '2026-07-02T09:14:00Z',
    is_due: isDue,
    example_words: exampleWords,
  }
}

async function openDrills(page: Page, dueSounds: unknown[]): Promise<void> {
  await page.route(RESURFACING_URL, (route) =>
    route.fulfill({ json: dueSounds }),
  )
  await page.route(WEAK_SOUNDS_URL, (route) =>
    route.fulfill({ json: MOCK_WEAK_SOUNDS }),
  )
  await page.route(MINIMAL_PAIRS_URL, (route) =>
    route.fulfill({ json: MOCK_CONTRASTS }),
  )
  await page.goto('/drills')
}

test.describe('targeted drills', () => {
  test('should lead with the due-for-review sound and route it to a drill', async ({
    page,
  }) => {
    await openDrills(page, [dueSound('ɹ', true, ['red'])])

    await expect(page.getByText('r vs l')).toBeVisible()
    await expect(page.getByText('Due', { exact: true })).toBeVisible()
    await expect(page.getByText('th vs f')).toHaveCount(0)
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Production' }),
    ).toHaveAttribute(
      'href',
      `/drills/production?phoneme=${encodeURIComponent('ɹ')}`,
    )
  })

  test('should fall back to the weak-sound ranking when nothing is due', async ({
    page,
  }) => {
    await openDrills(page, [dueSound('ɹ', false, ['red'])])

    await expect(page.getByText('th vs f')).toBeVisible()
    await expect(page.getByText('8x')).toBeVisible()
    await expect(page.getByText('r vs l')).toHaveCount(0)
  })
})
