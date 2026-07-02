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

type Theme = 'light' | 'dark'

interface CaptureCase {
  readonly name: string
  readonly act?: (page: Page) => Promise<void>
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

const CASES: readonly CaptureCase[] = [
  { name: 'idle' },
  { name: 'results', act: driveToResults },
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
    viewport: VIEWPORT,
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
    await mkdir(OUT_DIR, { recursive: true })
    const file = path.join(OUT_DIR, `home-${testCase.name}--${theme}.png`)
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
