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

const MOCK_PRODUCTION_PAIRS = [
  {
    phoneme_a: 'ɔ',
    phoneme_b: 'ɒ',
    label: 'walk vs wok',
    pairs: [{ word_a: 'walk', word_b: 'wok' }],
  },
]

const MOCK_DRILL_FLAGGED = {
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

const MOCK_WEAK_SOUNDS = [
  {
    phoneme: 'θ',
    occurrence_count: 5,
    word_count: 3,
    example_words: ['thought', 'three', 'path'],
    first_seen: '2026-06-28T07:41:00Z',
    last_seen: '2026-07-02T09:14:00Z',
  },
  {
    phoneme: 'ɹ',
    occurrence_count: 3,
    word_count: 2,
    example_words: ['red', 'around'],
    first_seen: '2026-06-30T18:02:00Z',
    last_seen: '2026-07-02T09:14:00Z',
  },
]

const MOCK_MINIMAL_PAIRS = [
  {
    phoneme_a: 'θ',
    phoneme_b: 'f',
    label: 'th vs f',
    pairs: [
      { word_a: 'thin', word_b: 'fin' },
      { word_a: 'three', word_b: 'free' },
    ],
  },
]

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
  await page.getByRole('link', { name: 'History' }).click()
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
    .getByRole('link', { name: /passage/ })
    .first()
    .click()
  await page.getByRole('heading', { name: 'Flagged words' }).waitFor()
}

async function driveToHistoryEmpty(page: Page): Promise<void> {
  await routeSessions(page, [])
  await openHistory(page)
  await page.getByText(/No sessions yet/).waitFor()
}

async function routeWeakSounds(
  page: Page,
  list: readonly unknown[],
): Promise<void> {
  await page.route('**/api/weak-sounds', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(list),
    }),
  )
}

async function openProgress(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Progress' }).click()
}

async function driveToProgress(page: Page): Promise<void> {
  await routeSessions(page, MOCK_SESSIONS)
  await routeWeakSounds(page, MOCK_WEAK_SOUNDS)
  await openProgress(page)
  await page.getByText('thought, three, path').waitFor()
}

async function driveToProgressEmpty(page: Page): Promise<void> {
  await routeSessions(page, [])
  await routeWeakSounds(page, [])
  await openProgress(page)
  await page.getByText(/No weak sounds yet/).waitFor()
}

async function routeMinimalPairs(
  page: Page,
  list: readonly unknown[],
): Promise<void> {
  await page.route('**/api/minimal-pairs', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(list),
    }),
  )
  await page.route('**/api/reference*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      body: Buffer.from([82, 73, 70, 70]),
    }),
  )
}

async function openEarTraining(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Ear training' }).click()
}

async function driveToEarTraining(page: Page): Promise<void> {
  await routeMinimalPairs(page, MOCK_MINIMAL_PAIRS)
  await openEarTraining(page)
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByText('Which word did you hear?').waitFor()
}

async function driveToEarTrainingEmpty(page: Page): Promise<void> {
  await routeMinimalPairs(page, [])
  await openEarTraining(page)
  await page.getByText(/No drill pairs are available yet/).waitFor()
}

async function openTargetedDrills(page: Page): Promise<void> {
  await routeWeakSounds(page, MOCK_WEAK_SOUNDS)
  await routeMinimalPairs(page, MOCK_MINIMAL_PAIRS)
  await page.getByRole('link', { name: 'Targeted' }).click()
}

async function driveToTargetedDrills(page: Page): Promise<void> {
  await openTargetedDrills(page)
  await page.getByText('th vs f').waitFor()
}

async function driveToTargetedDrillsEmpty(page: Page): Promise<void> {
  await routeWeakSounds(page, [])
  await routeMinimalPairs(page, MOCK_MINIMAL_PAIRS)
  await page.getByRole('link', { name: 'Targeted' }).click()
  await page.getByText(/No weak sounds yet/).waitFor()
}

async function driveToCollapsed(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
}

async function driveToMobileMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  await page.getByRole('link', { name: 'Progress' }).waitFor()
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

async function scoreDrill(page: Page, body: unknown): Promise<void> {
  await page.route('**/api/drills/minimal-pair/score', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    }),
  )
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: 'Check' }).click()
}

async function openProduction(page: Page): Promise<void> {
  await routeMinimalPairs(page, MOCK_PRODUCTION_PAIRS)
  await page.getByRole('link', { name: 'Production' }).click()
}

async function driveToProductionIdle(page: Page): Promise<void> {
  await openProduction(page)
  await page.getByRole('button', { name: 'Record', exact: true }).waitFor()
}

async function driveToProductionPass(page: Page): Promise<void> {
  await openProduction(page)
  await scoreDrill(page, { flagged_words: [] })
  await page.getByText(/landed/).waitFor()
}

async function driveToProductionRetry(page: Page): Promise<void> {
  await openProduction(page)
  await scoreDrill(page, MOCK_DRILL_FLAGGED)
  await page.getByText(/Not quite/).waitFor()
}

const NARROW_VIEWPORT = { width: 390, height: 800 }

const CASES: readonly CaptureCase[] = [
  { section: 'passage-scoring', name: 'idle' },
  { section: 'passage-scoring', name: 'results', act: driveToResults },
  { section: 'production-drill', name: 'idle', act: driveToProductionIdle },
  { section: 'production-drill', name: 'pass', act: driveToProductionPass },
  { section: 'production-drill', name: 'retry', act: driveToProductionRetry },
  { section: 'session-history', name: 'list', act: driveToHistoryList },
  { section: 'session-history', name: 'detail', act: driveToHistoryDetail },
  { section: 'session-history', name: 'empty', act: driveToHistoryEmpty },
  { section: 'progress-dashboard', name: 'populated', act: driveToProgress },
  { section: 'progress-dashboard', name: 'empty', act: driveToProgressEmpty },
  { section: 'ear-training', name: 'drill', act: driveToEarTraining },
  { section: 'ear-training', name: 'empty', act: driveToEarTrainingEmpty },
  { section: 'targeted-drills', name: 'queue', act: driveToTargetedDrills },
  {
    section: 'targeted-drills',
    name: 'empty',
    act: driveToTargetedDrillsEmpty,
  },
  { section: 'shell', name: 'sidebar', act: driveToProgress },
  { section: 'shell', name: 'collapsed', act: driveToCollapsed },
  { section: 'shell', name: 'mobile-closed', viewport: NARROW_VIEWPORT },
  {
    section: 'shell',
    name: 'mobile-open',
    act: driveToMobileMenu,
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
    const viewport = testCase.viewport ?? VIEWPORT
    await page.mouse.move(viewport.width - 4, viewport.height - 4)
    const sectionDir = path.join(OUT_DIR, testCase.section)
    await mkdir(sectionDir, { recursive: true })
    const file = path.join(sectionDir, `${testCase.name}--${theme}.png`)
    await page.screenshot({
      path: file,
      fullPage: true,
      animations: 'disabled',
    })
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
