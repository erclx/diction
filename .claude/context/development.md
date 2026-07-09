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
- Feedback stack, optional: `cd backend && uv sync --extra feedback` for the local-LLM explainer over Ollama. Skip it to run against the stub explainer with `DICTION_USE_STUB_EXPLAINER=true`.
- Reference-audio TTS, optional: `cd backend && uv sync --extra tts`. The synth is Kokoro-82M, which self-downloads its model from HuggingFace on first synthesis, so no voice file goes on disk. `DICTION_TTS_VOICE` is a Kokoro voice id defaulting to `af_heart`. Skip the extra to run against the stub synthesizer with `DICTION_USE_STUB_SYNTH=true`.

The local dev box is the RTX 5090 target machine named in `.claude/REQUIREMENTS.md`, so the `scoring` extra, wav2vec2, and Whisper large-v3 run directly here. Run `nvidia-smi` before concluding model or GPU work must be deferred or offloaded.

## Run the servers

| Command                      | Where    | Purpose                                             |
| ---------------------------- | -------- | --------------------------------------------------- |
| `bun run dev:all`            | root     | Run backend and frontend together, open the browser |
| `scripts/dev.sh restart`     | root     | Restart this worktree's pair                        |
| `scripts/dev.sh stop`        | root     | Stop this worktree's pair                           |
| `cd backend && bun run dev`  | backend  | FastAPI on `http://localhost:8000` with reload      |
| `cd frontend && bun run dev` | frontend | Vite dev server on `http://localhost:5173`          |

Root `bun run dev:all` starts both, opens the frontend, and prints the chosen URLs. On the first run in a fresh worktree it installs the frontend and backend dependencies when they are missing. It allocates a free port pair, defaulting to frontend 5173 and backend 8000 but stepping up when a port is busy, and exports `VITE_BACKEND_URL` so the frontend targets its own backend. Multiple worktrees can run pairs at once without collision. Each worktree records its pair in a pidfile under `.claude/.tmp/dev/`, so `scripts/dev.sh restart` and `scripts/dev.sh stop` act only on that worktree's pair. `Ctrl-C` also stops both.

`bun run dev:all` defaults to the stub `GopScorer`, `OllamaExplainer`, and `StubSynthesizer`, so a fresh checkout boots without the `scoring`, `feedback`, and `tts` extras. Set `DICTION_DEV_MODELS=real` to load the installed models instead. In real mode `dev.sh` provisions the runtime itself: it runs `uv sync --extra scoring --extra tts --extra feedback` and fails fast with an actionable message when Ollama is unreachable. Kokoro self-downloads its model into the HuggingFace cache on the first real boot, so no voice provisioning step is needed and worktrees share that cache. This is what lets a fresh linked worktree run `dev:real`, since the branch carries neither the extras nor the cached model. A surface that skips the LLM, such as Shadowing, can set `DICTION_USE_STUB_EXPLAINER=true` to bypass the Ollama requirement. A standalone `cd backend && bun run dev` does not provision anything and still builds the real stack by default, so it needs the extras or the matching `DICTION_USE_STUB_*` flags, and startup fails with an actionable message for whichever stack is missing. The backend honors `DICTION_BACKEND_PORT` for its listen port.

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

| Command             | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `bun run dev`       | Start uvicorn with reload on `DICTION_BACKEND_PORT` (default 8000) |
| `bun run lint`      | `ruff check`                                                       |
| `bun run lint:fix`  | `ruff check --fix` then `ruff format`                              |
| `bun run typecheck` | `mypy src` in strict mode                                          |
| `bun run test`      | `pytest`                                                           |
| `bun run test:run`  | `pytest` (used by `check`)                                         |
| `bun run check`     | Format, lint, typecheck, and unit tests                            |

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
