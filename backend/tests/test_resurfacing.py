from datetime import UTC, datetime, timedelta

from diction.scoring.resurfacing import (
    INTERVAL_LADDER_DAYS,
    MAX_BOX,
    ReviewEvent,
    ReviewOutcome,
    is_due,
    schedule_from_events,
)

BASE = datetime(2026, 1, 1, tzinfo=UTC)


def miss(day: int) -> ReviewEvent:
    return ReviewEvent(at=BASE + timedelta(days=day), outcome=ReviewOutcome.MISS)


def passed(day: int) -> ReviewEvent:
    return ReviewEvent(at=BASE + timedelta(days=day), outcome=ReviewOutcome.PASS)


def test_empty_history_has_no_schedule() -> None:
    assert schedule_from_events([]) is None


def test_a_single_miss_sits_in_box_zero_due_next_session() -> None:
    state = schedule_from_events([miss(0)])

    assert state is not None
    assert state.box == 0
    assert state.interval_days == INTERVAL_LADDER_DAYS[0]


def test_consecutive_passes_promote_up_the_ladder() -> None:
    state = schedule_from_events([passed(0), passed(1), passed(2)])

    assert state is not None
    assert state.box == 3
    assert state.interval_days == INTERVAL_LADDER_DAYS[3]


def test_a_miss_resets_the_box_to_zero() -> None:
    state = schedule_from_events([passed(0), passed(1), passed(2), miss(3)])

    assert state is not None
    assert state.box == 0
    assert state.interval_days == INTERVAL_LADDER_DAYS[0]


def test_a_later_pass_promotes_from_a_same_session_earlier_miss() -> None:
    state = schedule_from_events([miss(1), passed(1)])

    assert state is not None
    assert state.box == 1


def test_promotion_stops_at_the_top_of_the_ladder() -> None:
    state = schedule_from_events(
        [passed(day) for day in range(len(INTERVAL_LADDER_DAYS) + 3)]
    )

    assert state is not None
    assert state.box == MAX_BOX
    assert state.interval_days == INTERVAL_LADDER_DAYS[MAX_BOX]


def test_next_due_is_last_practiced_plus_the_box_interval() -> None:
    state = schedule_from_events([passed(0), passed(1)])

    assert state is not None
    assert state.last_practiced == BASE + timedelta(days=1)
    assert state.next_due == state.last_practiced + timedelta(
        days=INTERVAL_LADDER_DAYS[2]
    )


def test_is_due_when_now_reaches_the_next_due_date() -> None:
    state = schedule_from_events([miss(0)])

    assert state is not None
    assert is_due(state, state.next_due)
    assert not is_due(state, state.next_due - timedelta(seconds=1))
