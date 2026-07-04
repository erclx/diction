from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from sqlmodel import Session, SQLModel

from diction.db.engine import make_engine
from diction.db.models import FlaggedWord, PracticeSession
from diction.storage.sessions import save_session
from diction.storage.weak_sounds import aggregate_weak_sounds


@pytest.fixture
def db_session(tmp_path) -> Iterator[Session]:
    engine = make_engine(f'sqlite:///{tmp_path / "test.db"}')
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def make_session(created_at: datetime, *flagged: FlaggedWord) -> PracticeSession:
    record = PracticeSession(
        created_at=created_at,
        mode='passage',
        completeness=0.9,
        accuracy=0.8,
        fluency=0.7,
        phoneme_quality=0.6,
    )
    record.flagged_words = list(flagged)
    return record


def flag(word: str, phoneme: str) -> FlaggedWord:
    return FlaggedWord(word=word, phoneme=phoneme, start=0.0, end=0.1, explanation='')


def test_aggregate_counts_occurrences_distinct_words_and_examples(
    db_session: Session,
) -> None:
    earlier = datetime(2026, 1, 1)
    later = datetime(2026, 2, 1)
    save_session(
        db_session,
        make_session(earlier, flag('this', 'ð'), flag('that', 'ð')),
    )
    save_session(
        db_session,
        make_session(later, flag('the', 'ð'), flag('this', 'ð'), flag('ship', 'ɪ')),
    )

    rows = aggregate_weak_sounds(db_session)

    by_phoneme = {row.phoneme: row for row in rows}
    assert by_phoneme['ð'].occurrence_count == 4
    assert by_phoneme['ð'].word_count == 3
    assert by_phoneme['ð'].example_words[0] in {'the', 'this'}
    assert by_phoneme['ð'].first_seen == earlier
    assert by_phoneme['ð'].last_seen == later
    assert by_phoneme['ɪ'].occurrence_count == 1


def test_aggregate_orders_by_frequency_then_recency(db_session: Session) -> None:
    earlier = datetime(2026, 1, 1, tzinfo=UTC)
    later = datetime(2026, 2, 1, tzinfo=UTC)
    save_session(
        db_session, make_session(earlier, flag('this', 'ð'), flag('that', 'ð'))
    )
    save_session(db_session, make_session(later, flag('ship', 'ɪ'), flag('sit', 'ɪ')))
    save_session(db_session, make_session(later, flag('cat', 'æ')))

    rows = aggregate_weak_sounds(db_session)

    assert [row.phoneme for row in rows] == ['ɪ', 'ð', 'æ']


def test_aggregate_returns_empty_list_without_flagged_words(
    db_session: Session,
) -> None:
    rows = aggregate_weak_sounds(db_session)

    assert rows == []
