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
- `frontend/e2e/` owns Playwright specs and the screenshot capture harness

## Decisions

- Theme is a manual light, dark, or system choice. `useTheme` in `features/theme/` persists it to the `diction-theme` localStorage key and toggles a `.light` or `.dark` class on `<html>`. The `system` choice clears the class and falls back to `prefers-color-scheme`. An inline script in `index.html` stamps the class before first paint to avoid a flash, and shares the same storage key.
- Tokens live as CSS variables in `:root`, overridden by a `.dark` block for the explicit choice and by a `:root:not(.light):not(.dark)` block inside `prefers-color-scheme: dark` for the system fallback. The two dark blocks hold the same values and must move together. They map to utilities through `@theme inline`, so `bg-background` resolves the active palette at runtime.
- Type is self-hosted through Fontsource variable packages imported in `index.css`. `font-serif` (Newsreader) sets headings and the read-aloud passage. `font-sans` (Source Sans 3) sets UI body and labels. Fonts bundle as local woff2, so the offline guarantee holds.
- A flagged word replays the user's own recorded span through `useSpanPlayer`, not a native reference clip. Native TTS reference audio is a later feature.
- The score fetch carries a 60s `AbortSignal.timeout`. GPU scoring is intentionally slow, so the ceiling is generous rather than snappy.

## Hidden contracts

- The score response schema in `score-result.ts` mirrors the backend contract in `.claude/context/scoring.md`. The two must move together.
- `ClipTooWeakError` marks the 422 boundary. The UI branches on it to offer a re-record instead of a retry, so any new score-path error must preserve that type.
- Mic-driven e2e specs are gated to chromium because fake media relies on chromium launch flags set on that project in `playwright.config.ts`.

## Gotchas

- `MediaRecorder` assembles the blob in its async `onstop` handler, so the recording appears one tick after `stop()`. The object URL is revoked in a `useEffect` cleanup keyed on the recording.
- lint-staged does not prettier-format `.ts` files, only `.md` and `.json`. CI `check:format` runs prettier over everything, so a `.ts` file can pass commit and fail CI. Run prettier before pushing.
- cspell is a no-op from a linked worktree because `.claude/worktrees/` is gitignored, so it matches zero files. Verify spelling with `cspell --no-gitignore <files>`.
- e2e text assertions on short words collide with the passage copy. `getByText('thought')` matched `thoughtful`, so exact matching is required for flagged-word checks.
