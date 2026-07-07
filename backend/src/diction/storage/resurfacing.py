from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlmodel import Session, col, select

from diction.db.models import DrillRep, FlaggedWord, PracticeSession
from diction.scoring.resurfacing import (
    ReviewEvent,
    ReviewOutcome,
    is_due,
    schedule_from_events,
)

EXAMPLE_WORD_LIMIT = 5
PHONEME_DRILL_MODES = ('production', 'ear-training')


@dataclass(frozen=True, slots=True)
class ResurfacingRow:
    phoneme: str
    box: int
    interval_days: int
    last_practiced: datetime
    next_due: datetime
    is_due: bool
    example_words: list[str]


@dataclass(slots=True)
class _PhonemeHistory:
    events: list[ReviewEvent] = field(default_factory=list)
    example_words: list[str] = field(default_factory=list)


def _as_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment.astimezone(UTC)


def _collect_histories(session: Session) -> dict[str, _PhonemeHistory]:
    histories: dict[str, _PhonemeHistory] = {}

    flagged_statement = select(
        FlaggedWord.phoneme, FlaggedWord.word, PracticeSession.created_at
    ).join(PracticeSession)
    for phoneme, word, created_at in session.exec(flagged_statement).all():
        history = histories.setdefault(phoneme, _PhonemeHistory())
        history.events.append(
            ReviewEvent(at=_as_utc(created_at), outcome=ReviewOutcome.MISS)
        )
        if word not in history.example_words:
            history.example_words.append(word)

    drill_statement = select(DrillRep).where(
        col(DrillRep.mode).in_(PHONEME_DRILL_MODES),
        col(DrillRep.passed).is_not(None),
    )
    for rep in session.exec(drill_statement).all():
        history = histories.setdefault(rep.target, _PhonemeHistory())
        outcome = ReviewOutcome.PASS if rep.passed else ReviewOutcome.MISS
        history.events.append(ReviewEvent(at=_as_utc(rep.created_at), outcome=outcome))

    return histories


def aggregate_resurfacing(
    session: Session, now: datetime | None = None
) -> list[ResurfacingRow]:
    reference_now = _as_utc(now) if now is not None else datetime.now(UTC)
    histories = _collect_histories(session)

    rows: list[ResurfacingRow] = []
    for phoneme, history in histories.items():
        state = schedule_from_events(history.events)
        if state is None:
            continue
        rows.append(
            ResurfacingRow(
                phoneme=phoneme,
                box=state.box,
                interval_days=state.interval_days,
                last_practiced=state.last_practiced,
                next_due=state.next_due,
                is_due=is_due(state, reference_now),
                example_words=history.example_words[:EXAMPLE_WORD_LIMIT],
            )
        )

    rows.sort(
        key=lambda row: (reference_now - row.next_due).total_seconds(), reverse=True
    )
    return rows
