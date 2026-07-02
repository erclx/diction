import sqlite3
from collections.abc import Iterator

from sqlalchemy import Engine, event
from sqlmodel import Session, SQLModel, create_engine

from diction.config import get_settings
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


engine = make_engine(f'sqlite:///{get_settings().db_path}')


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
