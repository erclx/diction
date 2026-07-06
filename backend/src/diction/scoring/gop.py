"""Pure GOP aggregation. No model or numpy imports, so this core is unit-tested
against synthetic posteriors without any GPU library or download.

Thresholds are calibrated against the speechocean762 corpus. The flag keys off
each phoneme's own native baseline in `phoneme_baselines.py`, not one global
cutoff, because native GOP baselines differ by phoneme. See
`.claude/context/scoring.md`.
"""

from collections.abc import Iterable
from dataclasses import dataclass

from diction.scoring.audio import ClipTooWeakError
from diction.scoring.phoneme_baselines import FLAG_K, PHONEME_BASELINES
from diction.scoring.types import FlaggedWordResult, ScoreResult


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
    """Map a mean log-posterior (<= 0) onto a 0..100 proxy. Slope calibrated on
    speechocean762: a clean read (median GOP -0.13) lands near 99, a clearly-
    wrong one (median GOP -6.34) near 37."""
    return max(0.0, min(100.0, 100.0 + gop * 10.0))


def _normalized_deviation(phoneme: AlignedPhoneme) -> float | None:
    """How many standard deviations the phoneme sits below its native mean, or
    None when the phoneme is uncalibrated and cannot be judged."""
    baseline = PHONEME_BASELINES.get(phoneme.phoneme)
    if baseline is None:
        return None
    mean, std = baseline
    if std <= 0:
        return None
    return (phoneme.gop - mean) / std


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
    """Flag the most abnormal phoneme per word, ranked by how far below its own
    native baseline it sits, not by absolute GOP. A word is flagged only when
    that phoneme falls more than FLAG_K standard deviations below its mean.
    Uncalibrated phonemes still bound the word span but never trigger a flag."""
    worst_by_word: dict[int, tuple[AlignedPhoneme, float]] = {}
    word_bounds: dict[int, tuple[float, float]] = {}
    for phoneme in aligned:
        start, end = word_bounds.get(phoneme.word_index, (phoneme.start, phoneme.end))
        word_bounds[phoneme.word_index] = (
            min(start, phoneme.start),
            max(end, phoneme.end),
        )
        deviation = _normalized_deviation(phoneme)
        if deviation is None:
            continue
        current = worst_by_word.get(phoneme.word_index)
        if current is None or deviation < current[1]:
            worst_by_word[phoneme.word_index] = (phoneme, deviation)
    return [
        FlaggedWordResult(
            word=phoneme.word,
            start=word_bounds[word_index][0],
            end=word_bounds[word_index][1],
            phoneme=phoneme.phoneme,
        )
        for word_index, (phoneme, deviation) in sorted(worst_by_word.items())
        if deviation < -FLAG_K
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
