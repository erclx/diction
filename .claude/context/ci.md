---
title: CI
description: GitHub Actions workflow triggers and checks
---

# CI

GitHub Actions workflow for this project.

## Triggers

- Pull requests targeting `main`
- `workflow_dispatch` (manual run from the Actions tab)

## Checks

Defined in `.github/workflows/verify.yml`. Four jobs run in parallel and all must pass before merge.

| Job              | Asserts                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| 🛡️ Static Checks | Shared prettier, shfmt, cspell, and shellcheck are clean                         |
| 🐍 Backend       | `uv` sync, then `ruff`, `ruff format --check`, `mypy`, and `pytest`              |
| ⚛️ Frontend      | `bun` install, then `tsc --noEmit`, `oxlint`, and `vitest`                       |
| 🎭 E2E           | Starts the backend, installs the Playwright chromium browser, runs the e2e suite |

## Running CI locally

`bun run check` at the root runs the shared asserts (auto-formatting first), then the backend and frontend checks. The e2e suite runs with `cd frontend && bun run test:e2e` and needs the backend on port 8000. If CI fails on format, run `bun run check` locally and commit the diff.
