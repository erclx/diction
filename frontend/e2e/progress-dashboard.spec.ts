import { expect, type Page, test } from '@playwright/test'

const SESSIONS_URL = '**/api/sessions'
const WEAK_SOUNDS_URL = '**/api/weak-sounds'

const MOCK_SESSIONS = [
  {
    id: 12,
    created_at: '2026-07-02T09:14:00Z',
    mode: 'passage',
    accuracy: 92.2,
    phoneme_quality: 94,
  },
  {
    id: 11,
    created_at: '2026-06-30T18:02:00Z',
    mode: 'passage',
    accuracy: 82.1,
    phoneme_quality: 80,
  },
]

const MOCK_WEAK_SOUNDS = [
  {
    phoneme: 'θ',
    occurrence_count: 5,
    word_count: 3,
    example_words: ['thought', 'three', 'path'],
    first_seen: '2026-06-28T07:41:00Z',
    last_seen: '2026-07-02T09:14:00Z',
  },
]

async function openProgress(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('link', { name: 'Progress' }).click()
}

test.describe('progress dashboard', () => {
  test('should render the score trend and ranked weak sounds', async ({
    page,
  }) => {
    await page.route(SESSIONS_URL, (route) =>
      route.fulfill({ json: MOCK_SESSIONS }),
    )
    await page.route(WEAK_SOUNDS_URL, (route) =>
      route.fulfill({ json: MOCK_WEAK_SOUNDS }),
    )

    await openProgress(page)

    await expect(page).toHaveURL(/\/progress$/)
    await expect(
      page.getByRole('img', { name: 'Score trend across past sessions' }),
    ).toBeVisible()
    await expect(page.getByText('thought, three, path')).toBeVisible()
    await expect(page.getByText('5x')).toBeVisible()
  })

  test('should show onboarding empty states routing back to practice', async ({
    page,
  }) => {
    await page.route(SESSIONS_URL, (route) => route.fulfill({ json: [] }))
    await page.route(WEAK_SOUNDS_URL, (route) => route.fulfill({ json: [] }))

    await openProgress(page)

    await expect(page.getByText(/No weak sounds yet/)).toBeVisible()
    await page.getByRole('link', { name: 'Read a passage' }).first().click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(/Read the passage aloud/)).toBeVisible()
  })
})
