from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from diction.config import get_settings
from diction.db import models  # noqa: F401  registers tables on SQLModel.metadata

engine = create_engine(
    f'sqlite:///{get_settings().db_path}',
    connect_args={'check_same_thread': False},
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
