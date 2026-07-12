---
title: Storage
description: SQLite persistence layer: table models, engine, and session access
---

# Storage

The persistence layer every practice mode writes through. One SQLite file per run mode, one engine, a session per request. Passage reads persist as `PracticeSession` rows, the four drills as `DrillRep` rows, and each passage clip lands on disk beside its session.

## Layer responsibilities

- `db/models.py` owns the `PracticeSession`, `FlaggedWord`, `InterviewMetrics`, and `DrillRep` table models.
- `db/engine.py` owns the engine, `create_db_and_tables`, `reset_dev_database`, and the `get_session` request dependency.
- `storage/sessions.py` owns `save_session`, `get_session_by_id`, `list_sessions`, and `delete_session` so routes stay thin.
- `storage/drills.py` owns `save_drill_rep` and `list_drill_reps`, the same thin-route pattern for drill outcomes.
- `storage/recordings.py` owns `store_recording`, `recording_file`, and `remove_recording`, the write, locate, and delete helpers for on-disk clips keyed by session id.
- `storage/interview.py` owns `save_interview_metrics` and `get_interview_metrics_by_session`, the write and by-session read for the interview CV signals that sit beside a `PracticeSession`.
- `storage/weak_sounds.py` owns `aggregate_weak_sounds`, a read-only cross-session rollup of `FlaggedWord` grouped by `phoneme` for the weak-sound priority list.
- `storage/resurfacing.py` owns `aggregate_resurfacing`, a read-only recompute of each phoneme's spaced-review schedule from its dated `FlaggedWord` misses and production and ear-training `DrillRep` outcomes, run through the pure `scoring/resurfacing.py` Leitner scheduler and returned due-first.

## Decisions

- Run mode selects the database. `Settings.run_mode` is `user` or `dev`. `user` binds a persistent file under `backend/data`, `dev` binds a scratch file under `backend/.dev-data` that the lifespan wipes before `create_all`, so dev and CI boot empty. `config.py` derives `resolved_db_path` and `resolved_recordings_dir` from the mode, and the engine reads the resolved path without knowing the mode. `dev.sh` and CI set `DICTION_RUN_MODE=dev`.
- Interview CV signals persist as an `InterviewMetrics` row keyed to `session_id`, not widened `PracticeSession` columns, the same call `DrillRep` made, since the four signals (`eye_contact_pct`, `stability`, `gesture_ratio`, `shoulder_tilt_deg`) are interview-only and a widened session table would carry four null columns for every passage and drill row. The link is a one-to-one `Relationship` with `uselist=False` on the session side and the FK on the metrics side. The interview score route writes the row after the session commits, so a metrics-save failure logs and rolls back its own transaction while the pronunciation session survives.
- Drills persist as `DrillRep`, not widened `PracticeSession` columns. `mode` is one of `production`, `ear-training`, `shadowing`, or `stress`, `target` holds the phoneme for the minimal-pair drills and the reference prompt for the prosody drills, `passed` is the verdict where one exists, and `score` is the directional prosody match where one exists. The shape matches the phoneme-keyed weak-sound rollup that v0.6 resurfacing reads.
- Recording bytes live on disk, never in SQLite. A passage save writes `<recordings_dir>/<session_id>.webm` after the row id exists, then stores the filename on `PracticeSession.recording_path`. `GET /api/sessions/{id}/recording` serves it back as a `FileResponse`.
- `PracticeSession.passage` stores the read text so the history detail can show what was practiced next to how it scored. It is nullable, since drills and any pre-recording rows have none.
- `PracticeSession.prompt` stores the interview question text, parallel to `passage` holding the scripted answer, so the practiced question persists from the moment the answer is scored. It is null for every non-interview mode, since only the interview route sets it, and it lives on the session rather than `InterviewMetrics` so the question survives even when the CV scorer degrades and no metrics row is written.
- Table models stay internal. API routes return separate response models, so the HTTP contract does not track the DB shape.
- Schema is created with `SQLModel.metadata.create_all()` in the app lifespan. Alembic is deferred until a real migration is needed, so a column change means resetting the local DB.
- The session table model is `PracticeSession`, not `Session`, to avoid clashing with SQLModel's own `Session`.
- Conventions for this layer are enforced by `.claude/rules/lib/370-sqlmodel.md`.

## Hidden contracts

- `make_engine` registers a `PRAGMA foreign_keys=ON` connect listener. The module engine and the tests both build through it, so the `flagged_words` foreign key is actually enforced.
- `reset_dev_database` deletes only when `run_mode == 'dev'` and the resolved path is not the user database file, so a misread env can never wipe real data.
- `DrillRep.passed` and `DrillRep.score` are both nullable. Production and ear-training reps carry a `passed` verdict with null score, prosody reps carry a directional `score` with null verdict, and neither invents the missing value.
- Resurfacing recomputes from history on read, holding no scheduler state and adding no table or migration, the same bet `aggregate_weak_sounds` makes. It reads only the two phoneme-keyed event sources: a `FlaggedWord` occurrence dated by its session is a miss, a production or ear-training `DrillRep` is a pass or miss by its `passed` verdict, and shadowing and stress reps are prompt-level so they are excluded. Stored datetimes are normalized to aware UTC before comparison, since SQLite hands back naive values and the scheduler compares against `datetime.now(UTC)`. The interval ladder is a placeholder on the same directional footing as the GOP and prosody thresholds, so the due ordering is the trustworthy signal and the exact next-due dates are not.
- Recording write is save, refresh, write file, set path, commit again. The session id exists only after the first commit, so a failure between the two commits leaves a row without a file. The retrieval route treats a missing file as a soft 404 through `recording_file` returning `None`.
- `delete_session` clears the `FlaggedWord` and `InterviewMetrics` children by explicit select-and-delete, then the `PracticeSession`, in one commit. This avoids `ON DELETE CASCADE` on those foreign keys and the local DB reset a schema change would force, keeping the delete in one testable place. It returns a `DeletedSession` value object carrying the freed `recording_path`, or `None` when the id is unknown, so the route distinguishes a missing session from a found one that never recorded, which a bare `str | None` recording path could not. The clip unlink is the route's job through `remove_recording`, run after this commit returns.
- Storage functions take the session as their first argument. Tests pass a temp-file session directly.
- `list_sessions` and `list_drill_reps` order newest-first with `id` as a tiebreaker on equal `created_at`.

## Gotchas

- SQLite ignores foreign-key constraints unless the pragma is set per connection. That is the whole reason `make_engine` exists rather than a bare `create_engine`.
- `FlaggedWord` gained `phoneme`, `start`, and `end` for scoring output. `PracticeSession` gained `recording_path`, `passage`, and `prompt`, and the `DrillRep` and `InterviewMetrics` tables landed alongside. Adding a column or a table needs a local DB reset, since there are no migrations yet.
- `PracticeSession.interview_metrics` is annotated `Optional['InterviewMetrics']`, not `'InterviewMetrics | None'`. SQLAlchemy cannot resolve a `'X | None'` forward-reference string as an expression and fails mapper init, so the `Optional[...]` form is required and carries a `# noqa: UP037, UP045` for the two ruff rules it trips. `InterviewMetrics` is defined after `PracticeSession`, which is why the forward reference exists at all.
- The user database moved from `backend/diction.db` to `backend/data/diction.db`. A pre-move database is orphaned and must be re-created by a fresh boot.
