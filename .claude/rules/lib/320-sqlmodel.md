---
description: Enforce SQLModel table, engine, and session conventions for the backend
paths:
  - 'backend/**/*.py'
---

# SQLMODEL STANDARDS

## Table models

- Define table models with `class Name(SQLModel, table=True)` under `src/diction/db/models.py`.
- Keep table models internal. Return separate API response models from routes so the HTTP contract does not track the DB shape.
- Set `__tablename__` explicitly. Do not rely on the class-name default.
- Give every table an `id: int | None = Field(default=None, primary_key=True)`.
- Link related tables with `Relationship(back_populates=...)` on both sides and a `foreign_key='table.id'` on the child column.
- Index foreign-key columns that later aggregation reads across.

## Engine and schema

- Build one `create_engine` at module scope in `src/diction/db/engine.py`, with the URL derived from `Settings`.
- Pass `connect_args={'check_same_thread': False}` for the SQLite engine so it serves the request threadpool.
- Create schema with `SQLModel.metadata.create_all(engine)`, invoked from the app `lifespan`. Alembic is deferred until a schema change needs a real migration. Until then a column change means resetting the local DB.
- Import `diction.db.models` in `engine.py` so the tables register on `SQLModel.metadata` before `create_all` runs.

## Sessions

- Scope the DB session per request through a generator dependency that yields then closes, per `.claude/rules/framework/220-fastapi.md`.
- Keep persistence logic in `src/diction/storage/`. Storage functions take the session as their first argument so routes stay thin and tests pass a temp-file session directly.
- Alias or qualify the SQLModel `Session` against the `Session` table model to avoid the name clash. Reference the table as `models.Session`.
- Use `col(...)` from `sqlmodel` when ordering or filtering on a column so the expression type-checks.
