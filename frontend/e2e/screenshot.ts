import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { type Browser, chromium, type Page } from '@playwright/test'

const PORT = Number(process.env.PREVIEW_PORT ?? 4173)
const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? `http://localhost:${PORT}`
const OUT_DIR = 'screenshots'
const VIEWPORT = { width: 1280, height: 800 }

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
      explanation:
        'The "th" came out as "t", place the tongue behind the teeth.',
    },
  ],
}

const MOCK_SESSIONS = [
  {
    id: 12,
    created_at: '2026-07-02T09:14:00Z',
    mode: 'passage',
    accuracy: 94.5,
    phoneme_quality: 94,
  },
  {
    id: 11,
    created_at: '2026-06-30T18:02:00Z',
    mode: 'passage',
    accuracy: 82.1,
    phoneme_quality: 80,
  },
  {
    id: 10,
    created_at: '2026-06-28T07:41:00Z',
    mode: 'passage',
    accuracy: 68.3,
    phoneme_quality: 65,
  },
]

const MOCK_SESSION_DETAIL = {
  id: 12,
  created_at: '2026-07-02T09:14:00Z',
  mode: 'passage',
  completeness: 90.9,
  accuracy: 94.5,
  fluency: 98,
  phoneme_quality: 94,
  flagged_words: [
    {
      word: 'thought',
      start: 6.19,
      end: 6.59,
      phoneme: 'θ',
      explanation:
        'The "th" came out as "t", place the tongue behind the teeth.',
    },
  ],
}

type Theme = 'light' | 'dark'

interface CaptureCase {
  readonly section: string
  readonly name: string
  readonly act?: (page: Page) => Promise<void>
  readonly viewport?: { readonly width: number; readonly height: number }
}

async function routeSessions(
  page: Page,
  list: readonly unknown[],
): Promise<void> {
  await page.route('**/api/sessions/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SESSION_DETAIL),
    }),
  )
  await page.route('**/api/sessions', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(list),
    }),
  )
}

async function openHistory(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'History' }).click()
}

async function driveToHistoryList(page: Page): Promise<void> {
  await routeSessions(page, MOCK_SESSIONS)
  await openHistory(page)
  await page.getByText('94.5').waitFor()
}

async function driveToHistoryDetail(page: Page): Promise<void> {
  await routeSessions(page, MOCK_SESSIONS)
  await openHistory(page)
  await page
    .getByRole('button', { name: /passage/ })
    .first()
    .click()
  await page.getByRole('heading', { name: 'Flagged words' }).waitFor()
}

async function driveToHistoryEmpty(page: Page): Promise<void> {
  await routeSessions(page, [])
  await openHistory(page)
  await page.getByText(/No sessions yet/).waitFor()
}

async function driveToResults(page: Page): Promise<void> {
  await page.route('**/api/passages/score', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SCORE),
    }),
  )
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: 'Score' }).click()
  await page.getByRole('heading', { name: 'Flagged words' }).waitFor()
}

const NARROW_VIEWPORT = { width: 390, height: 800 }

const CASES: readonly CaptureCase[] = [
  { section: 'passage-scoring', name: 'idle' },
  { section: 'passage-scoring', name: 'results', act: driveToResults },
  { section: 'session-history', name: 'list', act: driveToHistoryList },
  { section: 'session-history', name: 'detail', act: driveToHistoryDetail },
  { section: 'session-history', name: 'empty', act: driveToHistoryEmpty },
  {
    section: 'shell',
    name: 'nav-narrow',
    act: driveToHistoryList,
    viewport: NARROW_VIEWPORT,
  },
]

async function ensureServer(): Promise<void> {
  try {
    const response = await fetch(BASE_URL, {
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) {
      throw new Error(`status ${response.status}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `Cannot reach ${BASE_URL}: ${message}\nRun 'bun run screenshot', which builds and serves the app.`,
    )
    process.exit(2)
  }
}

async function capture(
  browser: Browser,
  testCase: CaptureCase,
  theme: Theme,
): Promise<void> {
  const context = await browser.newContext({
    viewport: testCase.viewport ?? VIEWPORT,
    colorScheme: theme,
    permissions: ['microphone'],
  })
  const page = await context.newPage()

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    if (testCase.act) {
      await testCase.act(page)
    }
    await page.mouse.move(0, 0)
    const sectionDir = path.join(OUT_DIR, testCase.section)
    await mkdir(sectionDir, { recursive: true })
    const file = path.join(sectionDir, `${testCase.name}--${theme}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`captured ${file}`)
  } finally {
    await context.close()
  }
}

async function main(): Promise<void> {
  await ensureServer()

  const browser = await chromium.launch({
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  })
  const themes: readonly Theme[] = ['light', 'dark']

  try {
    for (const testCase of CASES) {
      for (const theme of themes) {
        await capture(browser, testCase, theme)
      }
    }
  } finally {
    await browser.close()
  }
}

void main()
