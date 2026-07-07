import sqlite3
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import Engine, event
from sqlmodel import Session, SQLModel, create_engine

from diction.config import Settings, get_settings
from diction.db import models  # noqa: F401  registers tables on SQLModel.metadata


def make_engine(url: str) -> Engine:
    new_engine = create_engine(url, connect_args={'check_same_thread': False})

    @event.listens_for(new_engine, 'connect')
    def _enable_foreign_keys(
        dbapi_connection: sqlite3.Connection, connection_record: object
    ) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.close()

    return new_engine


engine = make_engine(f'sqlite:///{get_settings().resolved_db_path}')


def reset_dev_database(settings: Settings) -> None:
    if settings.run_mode != 'dev':
        return
    db_path = settings.resolved_db_path
    if db_path == settings.user_db_path:
        return
    db_path.unlink(missing_ok=True)


def create_db_and_tables() -> None:
    settings = get_settings()
    reset_dev_database(settings)
    db_path = settings.resolved_db_path
    _ensure_parent_dir(db_path)
    SQLModel.metadata.create_all(engine)


def _ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
