import { expect, type Page, test } from '@playwright/test'

const QUESTIONS_URL = '**/api/interview/questions'
const SCORE_URL = '**/api/interview/score'

const QUESTIONS = [
  {
    category: 'Leadership',
    question: 'Tell me about a project you led.',
    keyword_beats: ['scope', 'team', 'outcome'],
    scripted_answer: 'I led the migration\nend to end.',
  },
]

const SCORE_BODY = {
  completeness: 90,
  accuracy: 80,
  fluency: 70,
  phoneme_quality: 60,
  flagged_words: [
    {
      word: 'migration',
      start: 1.0,
      end: 1.4,
      phoneme: 'ɡ',
      explanation: 'The /ɡ/ sound scored low.',
    },
  ],
  transcript: 'I led the migration end to end',
  cv: {
    posture: { stability: 0.88, gesture_ratio: 0.25, shoulder_tilt_deg: 6.0 },
    eye_contact: { looking_pct: 82.0 },
  },
}

async function selectQuestion(page: Page): Promise<void> {
  await page.getByRole('combobox', { name: 'Interview question' }).click()
  await page
    .getByRole('option', { name: 'Tell me about a project you led.' })
    .click()
}

async function recordAndScore(page: Page): Promise<void> {
  await selectQuestion(page)
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: 'Score' }).click()
}

test.describe('interview', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'camera capture relies on chromium fake media',
  )

  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['camera', 'microphone'])
    await page.route(QUESTIONS_URL, (route) =>
      route.fulfill({ json: QUESTIONS }),
    )
  })

  test('should pick a question, record an answer, and show both report sections', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) => route.fulfill({ json: SCORE_BODY }))
    await page.goto('/interview')

    await selectQuestion(page)
    await expect(
      page.getByText('I led the migration end to end.'),
    ).toBeVisible()

    await recordAndScore(page)

    await expect(
      page.getByRole('heading', { name: 'Pronunciation' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Delivery' })).toBeVisible()
    await expect(page.getByText('82%')).toBeVisible()
    await expect(
      page.getByText('I led the migration end to end', { exact: true }),
    ).toBeVisible()
  })

  test('should hide the delivery section when the report has no cv', async ({
    page,
  }) => {
    await page.route(SCORE_URL, (route) =>
      route.fulfill({ json: { ...SCORE_BODY, cv: null } }),
    )
    await page.goto('/interview')

    await recordAndScore(page)

    await expect(
      page.getByRole('heading', { name: 'Pronunciation' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Delivery' }),
    ).toBeHidden()
  })

  test('should show an honest empty state when no questions are configured', async ({
    page,
  }) => {
    await page.route(QUESTIONS_URL, (route) => route.fulfill({ json: [] }))
    await page.goto('/interview')

    await expect(
      page.getByText(/No interview questions are configured/),
    ).toBeVisible()
  })
})
