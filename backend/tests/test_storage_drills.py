from collections.abc import Iterator

import pytest
from sqlmodel import Session, SQLModel

from diction.db.engine import make_engine
from diction.db.models import DrillRep
from diction.storage import drills as drills_storage


@pytest.fixture
def db_session(tmp_path) -> Iterator[Session]:
    engine = make_engine(f'sqlite:///{tmp_path / "test.db"}')
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_save_drill_rep_round_trips_a_production_rep(db_session: Session) -> None:
    saved = drills_storage.save_drill_rep(
        db_session, DrillRep(mode='production', target='ɔ', passed=True)
    )

    assert saved.id is not None
    reps = drills_storage.list_drill_reps(db_session)
    assert reps[0].target == 'ɔ'
    assert reps[0].passed is True
    assert reps[0].score is None


def test_save_drill_rep_round_trips_a_prosody_rep(db_session: Session) -> None:
    drills_storage.save_drill_rep(
        db_session, DrillRep(mode='shadowing', target='the thick fog', score=67.5)
    )

    reps = drills_storage.list_drill_reps(db_session)
    assert reps[0].passed is None
    assert reps[0].score == 67.5


def test_list_drill_reps_returns_newest_first(db_session: Session) -> None:
    older = drills_storage.save_drill_rep(
        db_session, DrillRep(mode='production', target='ɔ', passed=True)
    )
    newer = drills_storage.save_drill_rep(
        db_session, DrillRep(mode='production', target='ɒ', passed=False)
    )

    reps = drills_storage.list_drill_reps(db_session)

    assert [rep.id for rep in reps] == [newer.id, older.id]
