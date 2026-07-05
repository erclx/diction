"""Pure prosody comparison. No model, numpy, or GPU imports, so this core is
unit-tested against synthetic contours without any download.

Two learner clips of the same text are compared against a reference clip on two
axes: rhythm (the pattern of word durations) and intonation (the shape of the
pitch contour). Both scores are speaker-independent: pitch is normalized to
semitones around each speaker's own median, and durations to each speaker's own
total, so a low voice and a high voice reading the same sentence with the same
melody and timing score as a match.

The tolerances here are placeholders carried from the spike. They set the
distance at which a score reaches zero, and must be recalibrated against real
native and non-native recordings before the numbers are shown as final, the
same calibration discipline the GOP threshold carries.
"""

import math
from dataclasses import dataclass

# Distance, in semitones, at which the intonation match reaches zero. Half an
# octave of average contour deviation is the current placeholder.
INTONATION_TOLERANCE_SEMITONES = 6.0
# Distance, in duration-fraction units, at which the rhythm match reaches zero.
RHYTHM_TOLERANCE = 0.25
# Points both contours are resampled to before comparison, decoupling the score
# from clip length and frame rate.
CONTOUR_RESAMPLE_POINTS = 64


@dataclass(frozen=True, slots=True)
class ProsodyResult:
    rhythm_match: float
    intonation_match: float


def compare_prosody(
    reference_pitch: list[float],
    learner_pitch: list[float],
    reference_timings: list[tuple[float, float]],
    learner_timings: list[tuple[float, float]],
) -> ProsodyResult:
    return ProsodyResult(
        rhythm_match=rhythm_match(reference_timings, learner_timings),
        intonation_match=intonation_match(reference_pitch, learner_pitch),
    )


def intonation_match(reference_pitch: list[float], learner_pitch: list[float]) -> float:
    """Compare two pitch contours by melodic shape. Each is reduced to its
    voiced frames, converted to semitones around its own median, and resampled
    to a common length, so the score reflects the rise-and-fall pattern rather
    than absolute pitch. A flat delivery against a varied reference scores low."""
    reference = _resample(_voiced_semitones(reference_pitch), CONTOUR_RESAMPLE_POINTS)
    learner = _resample(_voiced_semitones(learner_pitch), CONTOUR_RESAMPLE_POINTS)
    if not reference or not learner:
        return 0.0
    deviation = _rms_difference(reference, learner)
    return _tolerance_score(deviation, INTONATION_TOLERANCE_SEMITONES)


def rhythm_match(
    reference_timings: list[tuple[float, float]],
    learner_timings: list[tuple[float, float]],
) -> float:
    """Compare two word-timing sequences by relative duration. Each word's
    duration is taken as a fraction of the speaker's total spoken time and the
    two fraction vectors are resampled to a common length, so an overall tempo
    difference does not penalize a matching rhythm while a compressed or evened-
    out delivery does."""
    reference = _resample(
        _duration_fractions(reference_timings), CONTOUR_RESAMPLE_POINTS
    )
    learner = _resample(_duration_fractions(learner_timings), CONTOUR_RESAMPLE_POINTS)
    if not reference or not learner:
        return 0.0
    deviation = _rms_difference(reference, learner)
    return _tolerance_score(deviation, RHYTHM_TOLERANCE)


def _voiced_semitones(pitch: list[float]) -> list[float]:
    voiced = [frequency for frequency in pitch if frequency > 0.0]
    if not voiced:
        return []
    median = _median(voiced)
    if median <= 0.0:
        return []
    return [12.0 * math.log2(frequency / median) for frequency in voiced]


def _duration_fractions(timings: list[tuple[float, float]]) -> list[float]:
    durations = [max(0.0, end - start) for start, end in timings]
    total = sum(durations)
    if total <= 0.0:
        return []
    return [duration / total for duration in durations]


def _resample(values: list[float], count: int) -> list[float]:
    if not values:
        return []
    if len(values) == 1:
        return [values[0]] * count
    last_index = len(values) - 1
    resampled: list[float] = []
    for step in range(count):
        position = step * last_index / (count - 1)
        lower = int(math.floor(position))
        upper = min(lower + 1, last_index)
        weight = position - lower
        resampled.append(values[lower] * (1.0 - weight) + values[upper] * weight)
    return resampled


def _rms_difference(left: list[float], right: list[float]) -> float:
    squared = [(a - b) ** 2 for a, b in zip(left, right, strict=True)]
    return math.sqrt(sum(squared) / len(squared))


def _tolerance_score(deviation: float, tolerance: float) -> float:
    return 100.0 * max(0.0, 1.0 - deviation / tolerance)


def _median(values: list[float]) -> float:
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2.0
