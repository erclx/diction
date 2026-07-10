# Diction

Local, offline pronunciation-training tool. FastAPI speech pipeline in `backend/`, Vite and React UI in `frontend/`, with shared tooling and governance at the repo root.

## Context

The project uses a three-tier context model. Know which tier holds what before reading or writing:

- Always loaded: root `CLAUDE.md`, `.claude/REQUIREMENTS.md`, `.claude/ARCHITECTURE.md`, and the `.claude/context/index.md` and `.claude/wireframes/index.md` discovery anchors. Project-wide invariants, product scope, and the anchors for on-demand domain and surface context.
- Path-scoped lazy: `.claude/rules/*.md` with `paths:` frontmatter. Coding standards that load only when files matching the glob are touched. Always-on rules apply every session.
- On-demand lookup: `.claude/context/<domain>.md` entries and `.claude/wireframes/<surface>.md` surfaces. Per-domain narrative and per-surface layout, loaded only when that domain or surface is touched. Use the always-loaded `.claude/context/index.md` and `.claude/wireframes/index.md` to pick which to read. Entries are populated by `claude-docs` at ship time.

@.claude/REQUIREMENTS.md
@.claude/ARCHITECTURE.md
@.claude/context/index.md
@.claude/wireframes/index.md

## Behavior

- Flag concerns or alternatives when a proposed change has tradeoffs worth discussing.
- When facing a judgment call with 2-3 reasonable options mid-flow, pick one and state the tradeoff in one sentence. Enumerate options only when the user's preference is the deciding factor.
- Match edit scope to the request. Ship minimal v1 and queue extensions as follow-ups.
- On simplification requests, edit only what the user named.
- Do not add features the user did not ask for.
- When rewriting a section, preserve existing code blocks, tables, and grouped examples unless the user asked to remove them.
- When planning an edit to `CLAUDE.md`, show the proposed change as a fenced `diff` block in chat first, then wait for approval before calling `Edit`
- After implementing a change with a runtime surface, start a worktree dev pair with `bun run dev:all`, verify against the running app, and share the printed localhost URL. A backend-only endpoint with no UI is a runtime surface too, so curl its real route live. The pair is cleaned up on session end.

## Indexes

- Before searching source in a domain or touching a UI surface, consult the relevant `index.md` (`.claude/context/`, `.claude/wireframes/`) and read the matching entry first. It orients faster than a blind grep.
- When a folder has an `index.md`, check it before reading individual files in that folder.
- For folders where an agent browses to pick a document, `index.md` is regenerated from each file's frontmatter. Do not hand-edit `index.md`. Code folders and scratch folders do not need one.
- Every `index.md` carries its own frontmatter (`title`, `subtitle`) that the walker preserves. To keep a folder's `index.md` hand-edited, add `auto: false` to its frontmatter.
- When a diff adds a new top-level source domain folder, draft its `.claude/context/<domain>.md` entry at ship time per `.claude/standards/context.md`. `claude-docs` only refreshes existing entries and never auto-creates.

## Markdown

- When editing any markdown file, follow `.claude/standards/prose.md`.
- When writing or updating `.claude/context/<domain>.md`, also follow `.claude/standards/context.md`.
- When writing or updating `.claude/wireframes/<surface>.md`, also follow `.claude/standards/wireframes.md`.

## Commands

- Run `bun run check` before committing. Full script reference in `.claude/context/development.md`.
- After pushing a branch or opening a PR, watch its CI to completion in the background with `gh pr checks <n>` and fix any failure before treating the ship as done. A green local `bun run check` does not guarantee a green CI run, since a linked worktree cannot reproduce every gate. The Worktrees section lists which gates diverge.
- `bun run dev:all` (or `scripts/dev.sh`) starts a frontend and backend pair, picking a free port pair per worktree and wiring `VITE_BACKEND_URL` automatically, so parallel worktrees do not collide. It defaults to the stub model stack. Set `DICTION_DEV_MODELS=real` to use installed models. Use `scripts/dev.sh restart` or `scripts/dev.sh stop` to manage this worktree's pair.
- Running Playwright e2e from a worktree, do not trust port 5173. `reuseExistingServer` reuses a parallel session's dev server and asserts against stale code. Run the specs through a throwaway config binding a free port with `reuseExistingServer: false`.
- The recording-fixture regression harness (`backend/tests/fixtures/recordings/`) runs real-stack only, gated behind `DICTION_FIXTURE_REGRESSION=1`, so CI and the default suite skip it. To add a fixture, do not boot the dev server: ask the human to self-record the clip with any recorder, telling them exactly what to say and how, then convert with ffmpeg and capture ground truth through the real scorer. Full workflow in `backend/tests/fixtures/recordings/manifest.md`.

## Output

- After creating or modifying a file, include its path on its own line so terminal emulators can make it clickable. Do not paraphrase paths into prose ("the seeds folder", "your CLAUDE.md").
- Use the path the user's editor can resolve. The editor is rooted at the main project root.
- In the main worktree: relative from `pwd` works because `pwd` equals the editor root.
- In a linked worktree (under `.claude/worktrees/<name>/`): use absolute paths. Relative paths from worktree `pwd` would not resolve against the editor's project root.
- When the response covers multiple files, group paths under headers: `**Created:**`, `**Modified:**`, `**Deleted:**`. For single-file changes, the path on its own line is enough.

## Key paths

- `backend/`: FastAPI speech pipeline on Python, managed with `uv`
- `frontend/`: Vite, React, and TypeScript UI, managed with `bun`
- repo root: shared tooling, hooks, and CI for the whole repo. Each subtree owns only its language config
- `.claude/`: planning docs (requirements, architecture, design, tasks)
- `.claude/context/`: per-domain narrative (how a domain is structured, decisions, gotchas), indexed via `.claude/context/index.md`
- `.claude/wireframes/`: per-surface ASCII layouts loaded on demand, indexed via `.claude/wireframes/index.md`
- `.claude/rules/`: path-scoped coding standards loaded by Claude Code on file match
- `.claude/review/`: gitignored scratch for review and UI-test output, overwritten on each run

## Spelling

- When cspell flags a word, rewrite typos. Add real terms to the appropriate dictionary in `cspell.json`.
- Keep dictionary files sorted alphabetically.
- The out-of-tree cspell pass only covers files as they were when it ran. Run it over the full changed-file set as the last step before pushing, after the final doc edit.

## Snippets

- When a snippet is referenced with `@`, execute its instructions immediately using available session context.

## Tasks

- `.claude/TASKS.md` is gitignored local session scratch. Edit freely. No staging or revert before commits.
- Only create a task for work that spans multiple sessions or has real dependencies. Handle small edits immediately without a task entry.
- Do not add tasks retroactively for work already completed. Completed work is visible in git.
- When a task needs execution detail beyond `.claude/TASKS.md`, create a plan in `.claude/plans/` and link to it from the task block's intro paragraph. When that task ships, leave its plan file in place. It stays useful through review and rework. Delete the plan only after the human confirms the merge.
- Write the plan in the same session as the task block. The session that executes the plan later inherits reasoning context it would otherwise have to re-derive.

## Memory

- Write all memory files to `.claude/memory/`, not `~/.claude/projects/`.
- Save a feedback memory only when the same mistake happens twice in the session, or when the user explicitly corrects you. First-occurrence slips are noise.
- Keep feedback memories to 3 lines: the rule, a one-line Why, and a one-line How to apply. Capture the pattern, not the recovery narrative.
- Before creating a new memory file, check for an existing one on the same topic. Update rather than duplicate.

## Scratch

- Write temporary files to `.claude/.tmp/<slug>/<file>.md` in the project root. Use a kebab-slug tied to the topic. Never use `/tmp` or a flat `<slug>-<file>.md`.

## Worktrees

- Implementation work runs in a linked worktree. From the main worktree, enter one with `/claude-worktree` before editing tracked files for a feature.
- Do not leave tracked-file edits uncommitted in the main worktree. It is PR-gated, so land every change on a branch: fold it into an in-flight linked worktree, or open its own PR. When that worktree has a live session, hand it the edit to commit rather than writing across worktrees.
- Shared session scratch (`.claude/plans/`, `.claude/review/`, `.claude/memory/`, `.claude/TASKS.md`) lives at the main worktree root, not inside a linked worktree. From a linked worktree, resolve these paths against the main root via `git worktree list --porcelain | grep -m 1 '^worktree ' | cut -d' ' -f2-`. Fall back to `pwd` if not a git repo.
- From a linked worktree, every `Edit` or `Write` to a tracked file (source, docs) must use a path starting with `pwd`. Only shared session scratch (`.claude/plans/`, `.claude/review/`, `.claude/memory/`, `.claude/TASKS.md`) resolves to the main worktree root.
- Never blanket `git add -A` over a dirty tree. Stage feature files explicitly so unrelated main edits do not ride into the feature commit, and restore any that leak with `git checkout origin/main -- <file>` before the PR.
- Reserve parallel worker tracks for features that touch disjoint files. If two plans share a wiring seam (`config.py`, `app.py`, `pyproject.toml`, `.env.example`, `uv.lock`), hand off one, merge and verify it, then start the second off the updated main.
- Pre-push `bun run check` can hard-fail in a linked worktree on gates CI does not run. `check:spell` matches 0 files under the gitignored worktree path, `check:frontend` fails with no `frontend/node_modules`, and mypy flags the locally-installed `scoring` extra. Run `cd frontend && bun install` before the first push, and add `--no-must-find-files` to `check:spell` in root `package.json` to end the spell false-fail. Push `--no-verify` only after confirming the finding is a worktree artifact outside your diff.
- Recording-fixture audio (`backend/tests/fixtures/recordings/audio/`) is gitignored and lives in the main worktree only, since a worktree cleanup wipes its own copy. Git does not carry it into a linked worktree, so copy the clips in before running the fixture harness there.
