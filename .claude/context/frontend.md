---
title: Frontend
description: React SPA structure, shadcn and token setup, mic capture, and the score client
---

# Frontend

## Layer responsibilities

- `frontend/src/features/<feature>/` owns one domain slice with its components, hooks, and API client
- `frontend/src/components/ui/` owns vendored shadcn primitives, treated as generated source
- `frontend/src/lib/utils.ts` owns the `cn` class merge helper
- `frontend/src/config.ts` owns the validated `BACKEND_URL`, the only place `import.meta.env` is read
- `frontend/src/test/` owns test infrastructure, MSW server and the provider render helper, not tests
- `frontend/e2e/` owns Playwright specs and the screenshot capture harness. The harness writes captures to `screenshots/<section>/<case>--<theme>.png`, grouped by surface, and includes one narrow width to guard against shell overflow

## Decisions

- Theme is a manual light, dark, or system choice. `useTheme` in `features/theme/` persists it to the `diction-theme` localStorage key and toggles a `.light` or `.dark` class on `<html>`. The `system` choice clears the class and falls back to `prefers-color-scheme`. An inline script in `index.html` stamps the class before first paint to avoid a flash, and shares the same storage key.
- Tokens live as CSS variables in `:root`, overridden by a `.dark` block for the explicit choice and by a `:root:not(.light):not(.dark)` block inside `prefers-color-scheme: dark` for the system fallback. The two dark blocks hold the same values and must move together. They map to utilities through `@theme inline`, so `bg-background` resolves the active palette at runtime.
- Type is self-hosted from the Fontsource variable woff2 files. `src/fonts.css` declares the faces with `font-display: optional`, generated from the Fontsource CSS so the file urls stay package-relative and Vite still bundles them. `optional` is the fix for a refresh-time reflow: `swap` painted the larger-metric fallback first, then swapped, so text grew then snapped back. `font-serif` (Newsreader) sets headings and the read-aloud passage. `font-sans` (Source Sans 3) sets UI body and labels. Fonts bundle as local woff2, so the offline guarantee holds.
- A flagged word carries two play controls: its own recorded span through `useSpanPlayer`, and a native reference clip through `useReferenceAudio` in `features/reference-audio/`. The passage card carries the same reference control for the whole passage. The reference hook fetches wav from `GET /api/reference` with TanStack Query keyed on the text, and plays it through a plain `HTMLAudioElement`, distinct from the Web Audio decode path `useSpanPlayer` needs for unseekable WebM. `useReferenceAudio` defers the fetch until the first click, so the flagged-word list does not synthesize every word on render.
- The score fetch carries a 60s `AbortSignal.timeout`. GPU scoring is intentionally slow, so the ceiling is generous rather than snappy.
- The app shell in `app.tsx` routes between surfaces with `react-router-dom`, so a refresh keeps the current surface and a session detail is deep-linkable. `BrowserRouter` mounts in `main.tsx` inside the `QueryClientProvider`. The routes are `/` for Practice, `/history` for the session list, and `/history/:sessionId` for one session's detail, so `session-history.tsx` reads the selected id from the route param rather than local state. The header nav uses `NavLink`, which drives `aria-current="page"` from the active route. `react-router-dom` was chosen over TanStack Router to avoid a second routing-and-loader paradigm, and the router owns URL state only while TanStack Query keeps all fetching. The active tab reads through weight and foreground color rather than a fill, because the warm-paper `secondary` token is too faint in light mode to signal selection. A left sidebar replaces the header tabs once a third surface lands.
- The backend status in the header collapses to its status dot below the `sm` breakpoint, dropping the `Backend: <state>` label so the shell does not overflow on narrow widths.
- Heading sizes step down from the shell: surface titles are `text-2xl`, sub-headings `text-xl`, and score numbers `text-2xl` to match across the list and detail. The read-aloud passage is `text-lg`, sized down so it does not compete with the surface title.

## Hidden contracts

- The score response schema in `score-result.ts` mirrors the backend contract in `.claude/context/scoring.md`. The two must move together.
- `ClipTooWeakError` marks the 422 boundary. The UI branches on it to offer a re-record instead of a retry, so any new score-path error must preserve that type.
- Mic-driven e2e specs are gated to chromium because fake media relies on chromium launch flags set on that project in `playwright.config.ts`.

## Gotchas

- `MediaRecorder` assembles the blob in its async `onstop` handler, so the recording appears one tick after `stop()`. The object URL is revoked in a `useEffect` cleanup keyed on the recording.
- `MediaRecorder` WebM clips are not seekable. `duration` reads `Infinity` and setting `HTMLAudioElement.currentTime` fails silently, so seeking to a flagged span played no audio. `useSpanPlayer` decodes the blob into an `AudioBuffer` and plays exact ranges through `AudioBufferSourceNode.start(0, start, end - start)`, which sidesteps seeking entirely.
- lint-staged does not prettier-format `.ts` files, only `.md` and `.json`. CI `check:format` runs prettier over everything, so a `.ts` file can pass commit and fail CI. Run prettier before pushing.
- cspell still matches zero files from a linked worktree because `.claude/worktrees/` is gitignored. `check:spell` passes `--no-must-find-files` so `bun run check` and pre-push no longer fail on the empty match, but spelling goes genuinely unchecked there. Verify by pointing cspell at an out-of-tree config that sets `useGitignore: false` with the project dictionaries.
- e2e text assertions on short words collide with the passage copy. `getByText('thought')` matched `thoughtful`, so exact matching is required for flagged-word checks.
