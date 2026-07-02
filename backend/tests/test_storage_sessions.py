from collections.abc import Iterator

import pytest
from sqlmodel import Session, SQLModel, create_engine

from diction.db import models
from diction.storage import sessions as sessions_storage


@pytest.fixture
def db_session(tmp_path) -> Iterator[Session]:
    engine = create_engine(f'sqlite:///{tmp_path / "test.db"}')
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def make_session(mode: str) -> models.Session:
    return models.Session(
        mode=mode,
        completeness=0.9,
        accuracy=0.8,
        fluency=0.7,
        phoneme_quality=0.6,
    )


def test_save_session_round_trips_scores_and_flagged_words(
    db_session: Session,
) -> None:
    record = make_session('passage')
    record.flagged_words = [
        models.FlaggedWord(word='walk', explanation='said as wok'),
        models.FlaggedWord(word='ship', explanation='said as sheep'),
    ]

    saved = sessions_storage.save_session(db_session, record)
    assert saved.id is not None
    fetched = sessions_storage.get_session_by_id(db_session, saved.id)

    assert fetched is not None
    assert fetched.accuracy == 0.8
    assert {word.word for word in fetched.flagged_words} == {'walk', 'ship'}


def test_list_sessions_returns_newest_first(db_session: Session) -> None:
    older = sessions_storage.save_session(db_session, make_session('passage'))
    newer = sessions_storage.save_session(db_session, make_session('drill'))

    result = sessions_storage.list_sessions(db_session)

    assert [session.id for session in result] == [newer.id, older.id]
