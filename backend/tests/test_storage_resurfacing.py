from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from sqlmodel import Session, SQLModel

from diction.db.engine import make_engine
from diction.db.models import DrillRep, FlaggedWord, PracticeSession
from diction.storage.drills import save_drill_rep
from diction.storage.resurfacing import aggregate_resurfacing
from diction.storage.sessions import save_session

NOW = datetime(2026, 3, 1, tzinfo=UTC)


@pytest.fixture
def db_session(tmp_path) -> Iterator[Session]:
    engine = make_engine(f'sqlite:///{tmp_path / "test.db"}')
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def flag(word: str, phoneme: str) -> FlaggedWord:
    return FlaggedWord(word=word, phoneme=phoneme, start=0.0, end=0.1, explanation='')


def save_flagged(session: Session, created_at: datetime, *flagged: FlaggedWord) -> None:
    record = PracticeSession(
        created_at=created_at,
        mode='passage',
        completeness=0.9,
        accuracy=0.8,
        fluency=0.7,
        phoneme_quality=0.6,
    )
    record.flagged_words = list(flagged)
    save_session(session, record)


def rep(session: Session, target: str, passed: bool, created_at: datetime) -> None:
    save_drill_rep(
        session,
        DrillRep(
            mode='production', target=target, passed=passed, created_at=created_at
        ),
    )


def test_a_recent_flagged_miss_is_due_with_its_example_word(
    db_session: Session,
) -> None:
    save_flagged(db_session, NOW - timedelta(days=2), flag('thin', 'θ'))

    rows = aggregate_resurfacing(db_session, now=NOW)

    assert len(rows) == 1
    assert rows[0].phoneme == 'θ'
    assert rows[0].box == 0
    assert rows[0].is_due is True
    assert rows[0].example_words == ['thin']


def test_passed_reps_promote_a_sound_out_of_the_due_window(
    db_session: Session,
) -> None:
    save_flagged(db_session, NOW - timedelta(days=40), flag('thin', 'θ'))
    rep(db_session, 'θ', True, NOW - timedelta(days=3))
    rep(db_session, 'θ', True, NOW - timedelta(days=2))

    rows = aggregate_resurfacing(db_session, now=NOW)

    assert rows[0].box == 2
    assert rows[0].is_due is False


def test_due_sounds_sort_ahead_of_scheduled_ones(db_session: Session) -> None:
    save_flagged(db_session, NOW - timedelta(days=2), flag('thin', 'θ'))
    rep(db_session, 'ɹ', True, NOW - timedelta(hours=1))

    rows = aggregate_resurfacing(db_session, now=NOW)

    assert [row.phoneme for row in rows] == ['θ', 'ɹ']
    assert rows[0].is_due is True
    assert rows[1].is_due is False


def test_shadowing_reps_are_excluded_from_per_phoneme_resurfacing(
    db_session: Session,
) -> None:
    save_drill_rep(
        db_session,
        DrillRep(mode='shadowing', target='the thick fog', score=67.5),
    )

    rows = aggregate_resurfacing(db_session, now=NOW)

    assert rows == []


def test_no_history_returns_an_empty_list(db_session: Session) -> None:
    rows = aggregate_resurfacing(db_session, now=NOW)

    assert rows == []
