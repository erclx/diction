"""Pure GOP aggregation. No model or numpy imports, so this core is unit-tested
against synthetic posteriors without any GPU library or download.

The scoring math and thresholds here are placeholders carried from the spike.
Recalibrate against real clips before the numbers are shown as final.
"""

from collections.abc import Iterable
from dataclasses import dataclass

from diction.scoring.audio import ClipTooWeakError
from diction.scoring.types import FlaggedWordResult, ScoreResult

# A phoneme scoring below this flags its word as mispronounced.
GOP_FLAG_THRESHOLD = -5.0


@dataclass(frozen=True, slots=True)
class AlignedPhoneme:
    word_index: int
    word: str
    phoneme: str
    gop: float
    start: float
    end: float


def _mean(values: Iterable[float]) -> float:
    collected = list(values)
    return sum(collected) / len(collected) if collected else 0.0


def normalize_gop(gop: float) -> float:
    """Map a mean log-posterior (<= 0) onto a 0..100 proxy. Recalibrate once
    real clips set the clean-vs-degraded spread."""
    return max(0.0, min(100.0, 100.0 + gop * 8.0))


def completeness(expected_words: list[str], spoken_words: list[str]) -> float:
    if not expected_words:
        return 0.0
    spoken = set(spoken_words)
    hit = sum(1 for word in expected_words if word in spoken)
    return 100.0 * hit / len(expected_words)


def fluency(spoken_spans: list[tuple[float, float]], duration: float) -> float:
    """Crude proxy: penalize long inter-word pauses. Replace with a real prosody
    measure when the prosody features land."""
    if len(spoken_spans) < 2 or duration <= 0:
        return 0.0
    gaps = [
        max(0.0, spoken_spans[i][0] - spoken_spans[i - 1][1])
        for i in range(1, len(spoken_spans))
    ]
    pause_ratio = sum(gaps) / duration
    return max(0.0, min(100.0, 100.0 * (1.0 - pause_ratio)))


def _flag_worst_phonemes(
    aligned: list[AlignedPhoneme],
) -> list[FlaggedWordResult]:
    worst_by_word: dict[int, AlignedPhoneme] = {}
    for phoneme in aligned:
        current = worst_by_word.get(phoneme.word_index)
        if current is None or phoneme.gop < current.gop:
            worst_by_word[phoneme.word_index] = phoneme
    return [
        FlaggedWordResult(
            word=phoneme.word,
            start=phoneme.start,
            end=phoneme.end,
            phoneme=phoneme.phoneme,
        )
        for _, phoneme in sorted(worst_by_word.items())
        if phoneme.gop < GOP_FLAG_THRESHOLD
    ]


def aggregate_scores(
    aligned: list[AlignedPhoneme],
    expected_words: list[str],
    spoken_words: list[str],
    spoken_spans: list[tuple[float, float]],
    duration: float,
) -> ScoreResult:
    # Nothing aligned means nothing measured, so a perfect score would be a false pass.
    if not aligned:
        raise ClipTooWeakError('no phonemes could be aligned to score')
    word_gops = _word_mean_gops(aligned)
    return ScoreResult(
        completeness=completeness(expected_words, spoken_words),
        accuracy=normalize_gop(_mean(word_gops.values())),
        fluency=fluency(spoken_spans, duration),
        phoneme_quality=normalize_gop(_mean(p.gop for p in aligned)),
        flagged_words=_flag_worst_phonemes(aligned),
    )


def _word_mean_gops(aligned: list[AlignedPhoneme]) -> dict[int, float]:
    grouped: dict[int, list[float]] = {}
    for phoneme in aligned:
        grouped.setdefault(phoneme.word_index, []).append(phoneme.gop)
    return {index: _mean(gops) for index, gops in grouped.items()}
