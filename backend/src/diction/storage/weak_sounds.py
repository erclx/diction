from dataclasses import dataclass
from datetime import datetime

from sqlmodel import Session, col, select

from diction.db.models import FlaggedWord, PracticeSession

EXAMPLE_WORD_LIMIT = 5


@dataclass(frozen=True, slots=True)
class WeakSoundRow:
    phoneme: str
    occurrence_count: int
    word_count: int
    example_words: list[str]
    first_seen: datetime
    last_seen: datetime


@dataclass(slots=True)
class _PhonemeAggregate:
    occurrence_count: int
    example_words: list[str]
    first_seen: datetime
    last_seen: datetime


def aggregate_weak_sounds(session: Session) -> list[WeakSoundRow]:
    statement = (
        select(FlaggedWord.phoneme, FlaggedWord.word, PracticeSession.created_at)
        .join(PracticeSession)
        .order_by(col(PracticeSession.created_at).desc())
    )

    aggregates: dict[str, _PhonemeAggregate] = {}
    for phoneme, word, created_at in session.exec(statement).all():
        aggregate = aggregates.get(phoneme)
        if aggregate is None:
            aggregates[phoneme] = _PhonemeAggregate(
                occurrence_count=1,
                example_words=[word],
                first_seen=created_at,
                last_seen=created_at,
            )
            continue

        aggregate.occurrence_count += 1
        aggregate.first_seen = min(aggregate.first_seen, created_at)
        aggregate.last_seen = max(aggregate.last_seen, created_at)
        if word not in aggregate.example_words:
            aggregate.example_words.append(word)

    rows = [
        WeakSoundRow(
            phoneme=phoneme,
            occurrence_count=aggregate.occurrence_count,
            word_count=len(aggregate.example_words),
            example_words=aggregate.example_words[:EXAMPLE_WORD_LIMIT],
            first_seen=aggregate.first_seen,
            last_seen=aggregate.last_seen,
        )
        for phoneme, aggregate in aggregates.items()
    ]
    rows.sort(key=lambda row: (row.occurrence_count, row.last_seen), reverse=True)
    return rows
