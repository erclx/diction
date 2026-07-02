---
title: Storage
description: SQLite persistence layer: table models, engine, and session access
---

# Storage

The persistence layer every practice mode writes through. One SQLite file, one engine, a session per request.

## Layer responsibilities

- `db/models.py` owns the `PracticeSession` and `FlaggedWord` table models.
- `db/engine.py` owns the engine, `create_db_and_tables`, and the `get_session` request dependency.
- `storage/sessions.py` owns `save_session`, `get_session_by_id`, and `list_sessions` so routes stay thin.

## Decisions

- Table models stay internal. API routes return separate response models, so the HTTP contract does not track the DB shape.
- Schema is created with `SQLModel.metadata.create_all()` in the app lifespan. Alembic is deferred until a real migration is needed, so a column change means resetting the local DB.
- The session table model is `PracticeSession`, not `Session`, to avoid clashing with SQLModel's own `Session`.
- Conventions for this layer are enforced by `.claude/rules/lib/370-sqlmodel.md`.

## Hidden contracts

- `make_engine` registers a `PRAGMA foreign_keys=ON` connect listener. The module engine and the tests both build through it, so the `flagged_words` foreign key is actually enforced.
- Storage functions take the session as their first argument. Tests pass a temp-file session directly.
- `list_sessions` orders newest-first with `id` as a tiebreaker on equal `created_at`.

## Gotchas

- SQLite ignores foreign-key constraints unless the pragma is set per connection. That is the whole reason `make_engine` exists rather than a bare `create_engine`.
- `FlaggedWord` gained `phoneme`, `start`, and `end` for scoring output. Adding columns needs a local DB reset, since there are no migrations yet.
