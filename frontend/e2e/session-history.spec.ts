import { expect, type Page, test } from '@playwright/test'

const LIST_URL = '**/api/sessions'
const DETAIL_URL = '**/api/sessions/*'

const MOCK_LIST = [
  {
    id: 12,
    created_at: '2026-07-02T09:14:00Z',
    mode: 'passage',
    accuracy: 92.2,
    phoneme_quality: 94,
  },
]

const MOCK_DETAIL = {
  id: 12,
  created_at: '2026-07-02T09:14:00Z',
  mode: 'passage',
  completeness: 90.9,
  accuracy: 92.2,
  fluency: 98,
  phoneme_quality: 94,
  flagged_words: [
    {
      word: 'thought',
      start: 6.19,
      end: 6.59,
      phoneme: 'θ',
      explanation: 'Say th, not t.',
    },
  ],
}

async function openHistory(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('link', { name: 'History' }).click()
}

test.describe('session history', () => {
  test('should list saved sessions and open a session detail', async ({
    page,
  }) => {
    await page.route(DETAIL_URL, (route) =>
      route.fulfill({ json: MOCK_DETAIL }),
    )
    await page.route(LIST_URL, (route) => route.fulfill({ json: MOCK_LIST }))

    await openHistory(page)

    await expect(page.getByText('92.2')).toBeVisible()
    await page.getByRole('link', { name: /passage/ }).click()

    await expect(page).toHaveURL(/\/history\/12$/)
    await expect(page.getByText('Completeness')).toBeVisible()
    await expect(page.getByText('thought', { exact: true })).toBeVisible()
  })

  test('should mark the History nav as current on the list view', async ({
    page,
  }) => {
    await page.route(LIST_URL, (route) => route.fulfill({ json: MOCK_LIST }))

    await openHistory(page)
    await page.mouse.move(0, 0)

    const nav = page.getByRole('navigation', { name: 'Views' })

    await expect(nav.getByRole('link', { name: 'History' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(
      nav.getByRole('link', { name: 'Passage' }),
    ).not.toHaveAttribute('aria-current')
  })

  test('should keep the history surface on reload', async ({ page }) => {
    await page.route(LIST_URL, (route) => route.fulfill({ json: MOCK_LIST }))

    await openHistory(page)
    await expect(page).toHaveURL(/\/history$/)
    await page.reload()

    await expect(page.getByText('92.2')).toBeVisible()
    await expect(page.getByRole('link', { name: 'History' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('should return to the list from a session detail', async ({ page }) => {
    await page.route(DETAIL_URL, (route) =>
      route.fulfill({ json: MOCK_DETAIL }),
    )
    await page.route(LIST_URL, (route) => route.fulfill({ json: MOCK_LIST }))

    await openHistory(page)
    await page.getByRole('link', { name: /passage/ }).click()
    await expect(page.getByText('Completeness')).toBeVisible()

    await page.getByRole('link', { name: 'Back to history' }).click()

    await expect(page.getByText('Completeness')).toBeHidden()
    await expect(page.getByText('92.2')).toBeVisible()
  })

  test('should render a session detail from a deep link', async ({ page }) => {
    await page.route(DETAIL_URL, (route) =>
      route.fulfill({ json: MOCK_DETAIL }),
    )
    await page.route(LIST_URL, (route) => route.fulfill({ json: MOCK_LIST }))

    await page.goto('/history/12')

    await expect(page.getByText('Completeness')).toBeVisible()
    await expect(page.getByText('thought', { exact: true })).toBeVisible()
  })

  test('should return to the list with the browser back button', async ({
    page,
  }) => {
    await page.route(DETAIL_URL, (route) =>
      route.fulfill({ json: MOCK_DETAIL }),
    )
    await page.route(LIST_URL, (route) => route.fulfill({ json: MOCK_LIST }))

    await openHistory(page)
    await page.getByRole('link', { name: /passage/ }).click()
    await expect(page.getByText('Completeness')).toBeVisible()

    await page.goBack()

    await expect(page).toHaveURL(/\/history$/)
    await expect(page.getByText('92.2')).toBeVisible()
  })

  test('should redirect an unknown path to practice', async ({ page }) => {
    await page.goto('/does-not-exist')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(/Read the passage aloud/)).toBeVisible()
  })

  test('should show an onboarding empty state and route back to practice', async ({
    page,
  }) => {
    await page.route(LIST_URL, (route) => route.fulfill({ json: [] }))

    await openHistory(page)

    await expect(page.getByText(/No sessions yet/)).toBeVisible()
    await page.getByRole('link', { name: 'Read a passage' }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(/Read the passage aloud/)).toBeVisible()
  })

  test('should show an actionable error when the list fails', async ({
    page,
  }) => {
    await page.route(LIST_URL, (route) => route.fulfill({ status: 500 }))

    await openHistory(page)

    await expect(page.getByRole('alert')).toContainText('Could not load your')
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
  })

  test('should show a not-found message for a missing session', async ({
    page,
  }) => {
    await page.route(DETAIL_URL, (route) => route.fulfill({ status: 404 }))
    await page.route(LIST_URL, (route) => route.fulfill({ json: MOCK_LIST }))

    await openHistory(page)
    await page.getByRole('link', { name: /passage/ }).click()

    await expect(page.getByRole('alert')).toContainText('no longer exists')
  })
})
