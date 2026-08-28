# Diction

Local, offline pronunciation-training tool. FastAPI speech pipeline in `backend/`, Vite and React UI in `frontend/`, with shared tooling and governance at the repo root.

## Context

The project uses a three-tier context model. Know which tier holds what before reading or writing:

- Always loaded: root `CLAUDE.md`, `.claude/REQUIREMENTS.md`, `.claude/ARCHITECTURE.md`, and the `.claude/context/index.md` and `.claude/wireframes/index.md` discovery anchors. Project-wide invariants, product scope, and the anchors for on-demand domain and surface context.
- Path-scoped lazy: `.claude/rules/*.md` with `paths:` frontmatter. Coding standards that load only when files matching the glob are touched. Always-on rules apply every session.
- On-demand lookup: `.claude/context/<domain>.md` entries and `.claude/wireframes/<surface>.md` surfaces. Per-domain narrative and per-surface layout, loaded only when that domain or surface is touched. Use the always-loaded `.claude/context/index.md` and `.claude/wireframes/index.md` to pick which to read. Entries are populated by `claude-docs` at ship time.
- When a diff adds a new top-level source domain folder, draft its `.claude/context/<domain>.md` entry at ship time per `aitk standards context`. `claude-docs` only refreshes existing entries and never auto-creates.

@.claude/REQUIREMENTS.md
@.claude/ARCHITECTURE.md
@.claude/context/index.md
@.claude/wireframes/index.md

## Behavior

- After implementing a change with a runtime surface, start a worktree dev pair with `bun run dev:all`, verify against the running app, and share the printed localhost URL. A backend-only endpoint with no UI is a runtime surface too, so curl its real route live. The pair is cleaned up on session end.

## Commands

- Run `bun run check` before committing. Full script reference in `.claude/context/development.md`.
- After pushing a branch or opening a PR, watch its CI to completion in the background with `gh pr checks <n>` and fix any failure before treating the ship as done. A green local `bun run check` does not guarantee a green CI run, since a linked worktree cannot reproduce every gate. The Worktrees section lists which gates diverge.
- `bun run dev:all` (or `scripts/dev.sh`) starts a frontend and backend pair, picking a free port pair per worktree and wiring `VITE_BACKEND_URL` automatically, so parallel worktrees do not collide. It defaults to the stub model stack. Set `DICTION_DEV_MODELS=real` to use installed models. Use `scripts/dev.sh restart` or `scripts/dev.sh stop` to manage this worktree's pair.
- Running Playwright e2e from a worktree, do not trust port 5173. `reuseExistingServer` reuses a parallel session's dev server and asserts against stale code. Run the specs through a throwaway config binding a free port with `reuseExistingServer: false`.
- The recording-fixture regression harness (`backend/tests/fixtures/recordings/`) runs real-stack only, gated behind `DICTION_FIXTURE_REGRESSION=1`, so CI and the default suite skip it. To add a fixture, do not boot the dev server: ask the human to self-record the clip with any recorder, telling them exactly what to say and how, then convert with ffmpeg and capture ground truth through the real scorer. Full workflow in `backend/tests/fixtures/recordings/manifest.md`.

## Key paths

- `backend/`: FastAPI speech pipeline on Python, managed with `uv`
- `frontend/`: Vite, React, and TypeScript UI, managed with `bun`
- repo root: shared tooling, hooks, and CI for the whole repo. Each subtree owns only its language config
- `.claude/`: planning docs (requirements, architecture, design, tasks)
- `.claude/context/`: per-domain narrative (how a domain is structured, decisions, gotchas), indexed via `.claude/context/index.md`
- `.claude/wireframes/`: per-surface ASCII layouts loaded on demand, indexed via `.claude/wireframes/index.md`
- `.claude/rules/`: path-scoped coding standards loaded by Claude Code on file match
- `.claude/review/`: gitignored scratch for review and UI-test output, overwritten on each run
- `.claude/wiki/`: reference pages for tools, workflows, and concepts, indexed via `.claude/wiki/index.md`

## Spelling

- The out-of-tree cspell pass only covers files as they were when it ran. Run it over the full changed-file set as the last step before pushing, after the final doc edit.

## Memory

- Write all memory files to `.claude/memory/`, not `~/.claude/projects/`.
- Save a feedback memory only when the same mistake happens twice in the session, or when the user explicitly corrects you. First-occurrence slips are noise.
- Keep feedback memories to 3 lines: the rule, a one-line Why, and a one-line How to apply. Capture the pattern, not the recovery narrative.
- Before creating a new memory file, check for an existing one on the same topic. Update rather than duplicate.

## Worktrees

- Do not leave tracked-file edits uncommitted in the main worktree. It is PR-gated, so land every change on a branch: fold it into an in-flight linked worktree, or open its own PR. When that worktree has a live session, hand it the edit to commit rather than writing across worktrees.
- Never blanket `git add -A` over a dirty tree. Stage feature files explicitly so unrelated main edits do not ride into the feature commit, and restore any that leak with `git checkout origin/main -- <file>` before the PR.
- Reserve parallel worker tracks for features that touch disjoint files. If two plans share a wiring seam (`config.py`, `app.py`, `pyproject.toml`, `.env.example`, `uv.lock`), hand off one, merge and verify it, then start the second off the updated main.
- Pre-push `bun run check` can hard-fail in a linked worktree on gates CI does not run. `check:spell` matches 0 files under the gitignored worktree path, `check:frontend` fails with no `frontend/node_modules`, and mypy flags the locally-installed `scoring` extra. Run `cd frontend && bun install` before the first push, and add `--no-must-find-files` to `check:spell` in root `package.json` to end the spell false-fail. Push `--no-verify` only after confirming the finding is a worktree artifact outside your diff.
- Recording-fixture audio (`backend/tests/fixtures/recordings/audio/`) is gitignored and lives in the main worktree only, since a worktree cleanup wipes its own copy. Git does not carry it into a linked worktree, so copy the clips in before running the fixture harness there.
