"""Pure Leitner-style resurfacing scheduler. No model, DB, or GPU imports, so
this core is unit-tested against synthetic dated histories without any download.

A phoneme's dated outcome history, a sequence of pass and miss events, folds into
a single box on a fixed interval ladder. A miss resets the box to 0, due every
session, and each consecutive pass promotes one box onto a wider interval. The
"increasing interval once improved" requirement falls out for free: a sound the
user keeps missing never leaves box 0 and resurfaces constantly, while a sound
they pass repeatedly spaces out.

The interval ladder is a placeholder carried on the same directional footing as
the GOP and prosody thresholds. It is tuned from real longitudinal use later, so
the due ordering is the trustworthy signal and the exact next-due dates are not.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum

INTERVAL_LADDER_DAYS = (1, 3, 7, 16, 35)
MAX_BOX = len(INTERVAL_LADDER_DAYS) - 1


class ReviewOutcome(StrEnum):
    PASS = 'pass'
    MISS = 'miss'


@dataclass(frozen=True, slots=True)
class ReviewEvent:
    at: datetime
    outcome: ReviewOutcome


@dataclass(frozen=True, slots=True)
class ScheduleState:
    box: int
    interval_days: int
    last_practiced: datetime
    next_due: datetime


def interval_days_for_box(box: int) -> int:
    return INTERVAL_LADDER_DAYS[min(box, MAX_BOX)]


def schedule_from_events(events: Sequence[ReviewEvent]) -> ScheduleState | None:
    if not events:
        return None

    ordered = sorted(events, key=lambda event: event.at)
    box = 0
    for event in ordered:
        if event.outcome is ReviewOutcome.PASS:
            box = min(box + 1, MAX_BOX)
        else:
            box = 0

    last_practiced = ordered[-1].at
    interval_days = interval_days_for_box(box)
    return ScheduleState(
        box=box,
        interval_days=interval_days,
        last_practiced=last_practiced,
        next_due=last_practiced + timedelta(days=interval_days),
    )


def is_due(state: ScheduleState, now: datetime) -> bool:
    return now >= state.next_due


def overdue_seconds(state: ScheduleState, now: datetime) -> float:
    return (now - state.next_due).total_seconds()
