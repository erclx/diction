from diction.scoring.fluency import (
    extract_fluency_features,
    fluency,
    score_fluency,
)


def even_read(
    word_count: int, word_length: float, gap: float
) -> list[tuple[float, float]]:
    spans: list[tuple[float, float]] = []
    cursor = 0.0
    for _ in range(word_count):
        spans.append((cursor, cursor + word_length))
        cursor += word_length + gap
    return spans


def test_fluency_penalizes_long_pauses() -> None:
    tight = fluency([(0.0, 0.5), (0.5, 1.0)], duration=1.0)
    gappy = fluency([(0.0, 0.5), (2.5, 3.0)], duration=3.0)

    assert tight > gappy


def test_fluency_floors_a_clip_too_short_to_measure_rhythm() -> None:
    assert fluency([(0.0, 0.5)], duration=0.5) == 0.0
    assert fluency([], duration=1.0) == 0.0


def test_a_natural_read_with_a_hesitation_does_not_pin_at_one_hundred() -> None:
    spans = [
        (0.0, 0.30),
        (0.35, 0.80),
        (0.80, 1.05),
        (1.60, 2.10),
        (2.15, 2.40),
        (2.40, 2.95),
    ]

    score = fluency(spans, duration=2.95)

    assert 0.0 < score < 100.0


def test_a_halting_read_scores_below_a_fluent_one() -> None:
    fluent = even_read(word_count=8, word_length=0.35, gap=0.05)
    halting = even_read(word_count=8, word_length=0.35, gap=0.7)

    assert fluency(halting, duration=halting[-1][1]) < fluency(
        fluent, duration=fluent[-1][1]
    )


def test_pause_rate_counts_only_gaps_past_the_threshold() -> None:
    spans = [(0.0, 0.5), (0.6, 1.1), (1.9, 2.4)]

    features = extract_fluency_features(spans, duration=2.4)

    assert features is not None
    assert features.pause_rate == 1 / 3


def test_score_is_clamped_into_the_zero_hundred_range() -> None:
    erratic = extract_fluency_features(
        [(0.0, 0.1), (2.0, 4.0), (4.0, 4.05)], duration=4.05
    )

    assert erratic is not None
    assert 0.0 <= score_fluency(erratic) <= 100.0
