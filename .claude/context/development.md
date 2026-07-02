---
title: Development
description: Local dev workflow, per-subtree scripts, and husky hooks for the diction monorepo
---

# Development

One git repo holds two subprojects. Shared tooling lives at the root and each subtree owns its language checks.

- `backend/`: FastAPI on Python, managed with `uv`
- `frontend/`: Vite, React, and TypeScript, managed with `bun`

## Setup

- Install [Bun](https://bun.sh): `curl -fsSL https://bun.sh/install | bash`
- Install [uv](https://docs.astral.sh/uv): `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Root tooling: `bun install`
- Frontend deps: `cd frontend && bun install`
- Backend deps: `cd backend && uv sync`
- Model stack, optional and GPU-bound: `cd backend && uv sync --extra scoring`. Also needs the `espeak-ng` and `ffmpeg` system packages. Skip it to run against the stub scorer with `DICTION_USE_STUB_SCORER=true`.

## Run the servers

| Command                      | Where    | Purpose                                             |
| ---------------------------- | -------- | --------------------------------------------------- |
| `bun run dev`                | root     | Run backend and frontend together, open the browser |
| `cd backend && bun run dev`  | backend  | FastAPI on `http://localhost:8000` with reload      |
| `cd frontend && bun run dev` | frontend | Vite dev server on `http://localhost:5173`          |

The frontend calls the backend at `http://localhost:8000`. Root `bun run dev` starts both and opens `http://localhost:5173`, so the health check and API-backed views resolve without starting each subtree by hand. `Ctrl-C` stops both.

Backend startup builds the real `GopScorer` by default, so it needs the `scoring` extra installed. Without it, run `DICTION_USE_STUB_SCORER=true bun run dev` for the stub. Startup fails with an actionable message if neither is in place.

## Verify

Root `bun run check` runs shared format, spell, and shell checks, then the backend and frontend checks in turn. `pre-push` runs the same command.

| Command                  | Where | Purpose                                 |
| ------------------------ | ----- | --------------------------------------- |
| `bun run check`          | root  | Full verification across the whole repo |
| `bun run format`         | root  | Auto-fix prettier and shfmt formatting  |
| `bun run check:backend`  | root  | Backend checks only (`cd backend`)      |
| `bun run check:frontend` | root  | Frontend checks only (`cd frontend`)    |

## Backend scripts

Run from `backend/`. Each wraps `uv run` so Python tools resolve against the venv.

| Command             | Purpose                                 |
| ------------------- | --------------------------------------- |
| `bun run dev`       | Start uvicorn with reload on port 8000  |
| `bun run lint`      | `ruff check`                            |
| `bun run lint:fix`  | `ruff check --fix` then `ruff format`   |
| `bun run typecheck` | `mypy src` in strict mode               |
| `bun run test`      | `pytest`                                |
| `bun run test:run`  | `pytest` (used by `check`)              |
| `bun run check`     | Format, lint, typecheck, and unit tests |

## Frontend scripts

Run from `frontend/`.

| Command              | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `bun run dev`        | Start the Vite dev server on port 5173              |
| `bun run build`      | Typecheck then build the production bundle          |
| `bun run preview`    | Serve the built bundle locally                      |
| `bun run typecheck`  | `tsc --noEmit`                                      |
| `bun run lint`       | `oxlint`                                            |
| `bun run test:run`   | Vitest unit and integration tests (used by `check`) |
| `bun run test:e2e`   | Playwright e2e (auto-starts the dev server)         |
| `bun run screenshot` | Build, preview, and capture `screenshots/*.png`     |
| `bun run check`      | Typecheck, lint, and unit tests                     |

Network calls in unit tests are mocked with MSW, wired in `src/test/setup.ts`. The e2e health test needs the backend running on port 8000.

## Shell scripts

All `.sh` files live under `scripts/` at the root or a subtree. Do not place shell scripts elsewhere.

## Husky hooks

Hooks live at the repo root only, since Git has a single hooks path.

- `pre-commit` runs `lint-staged` (prettier, cspell, shfmt, shellcheck on staged files).
- `commit-msg` runs `commitlint` against the conventional commit format.
- `pre-push` runs `bun run check`. After pushing, run `git status`. If files changed, commit the diff as `style(<scope>):` and push again.
