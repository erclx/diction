---
description: Enforce SQLModel table, engine, and session conventions for the backend
paths:
  - 'backend/**/*.py'
---

# SQLMODEL STANDARDS

## Table models

- Define table models with `class Name(SQLModel, table=True)` in `src/diction/db/models.py`.
- Keep table models internal. Return separate response models from API routes.
- Set `__tablename__` explicitly on every table model.
- Give every table an `id: int | None = Field(default=None, primary_key=True)`.
- Link related tables with `Relationship(back_populates=...)` on both sides and `foreign_key='table.id'` on the child column.
- Index every foreign-key column.

## Engine and schema

- Build one `create_engine` at module scope in `src/diction/db/engine.py`, with the URL derived from `Settings`.
- Pass `connect_args={'check_same_thread': False}` to the SQLite engine.
- Create the schema with `SQLModel.metadata.create_all(engine)` from the app `lifespan`. Do not add Alembic until a schema change needs a real migration.
- Import `diction.db.models` in `engine.py` before calling `create_all`.

## Sessions

- Scope the DB session per request through a generator dependency that yields then closes, per `.claude/rules/framework/220-fastapi.md`.
- Keep persistence logic in `src/diction/storage/`. Pass the session as the first argument to each storage function.
- Name table models so they do not collide with the SQLModel `Session`, e.g. `PracticeSession`.
- Use `col(...)` from `sqlmodel` when ordering or filtering on a column.
