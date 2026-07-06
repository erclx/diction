"""Pure prosody comparison. No model, numpy, or GPU imports, so this core is
unit-tested against synthetic contours without any download.

Two learner clips of the same text are compared against a reference clip on two
axes: rhythm (the pattern of word durations) and intonation (the shape of the
pitch contour). Both scores are speaker-independent: pitch is normalized to
semitones around each speaker's own median, and durations to each speaker's own
total, so a low voice and a high voice reading the same sentence with the same
melody and timing score as a match.

Intonation compares the two contours on a shared linguistic timeline rather than
frame index. Each speaker's voiced pitch samples are placed at their position in
the spoken words, so word k of one reader lines up with word k of the other
regardless of tempo, and the pitch is compared at the same point in the sentence.
This is the #21 open item resolved: the earlier voiced-frame index comparison
lined up unrelated moments and floored the score to zero.

The tolerances here are placeholders carried from the spike. They set the
distance at which a score reaches zero, and the spike must recalibrate them
against real native and non-native recordings before the numbers are shown as
final, the same calibration discipline the GOP threshold carries.
"""

import math
from collections.abc import Callable
from dataclasses import dataclass

# Distance, in semitones, at which the intonation match reaches zero. Half an
# octave of average contour deviation is the current placeholder.
INTONATION_TOLERANCE_SEMITONES = 6.0
# Distance, in duration-fraction units, at which the rhythm match reaches zero.
RHYTHM_TOLERANCE = 0.25
# Points both contours are resampled to before comparison, decoupling the score
# from clip length and frame rate.
CONTOUR_RESAMPLE_POINTS = 64

# A pitch track is a per-frame (time_seconds, frequency_hz) series, with a
# frequency of zero marking an unvoiced frame. Word timings are (start, end)
# spans in seconds.
PitchTrack = list[tuple[float, float]]
WordTimings = list[tuple[float, float]]

PRIMARY_STRESS = 'ˈ'
SECONDARY_STRESS = 'ˌ'


@dataclass(frozen=True, slots=True)
class ProsodyResult:
    rhythm_match: float
    intonation_match: float


@dataclass(frozen=True, slots=True)
class StressMark:
    word: str
    syllables: list[str]
    stress_index: int


@dataclass(frozen=True, slots=True)
class ProsodyAnalysis:
    rhythm_match: float
    intonation_match: float
    reference_contour: list[float]
    learner_contour: list[float]
    reference_timings: list[tuple[float, float]]
    stress_marks: list[StressMark]


def compare_prosody(
    reference_pitch: PitchTrack,
    learner_pitch: PitchTrack,
    reference_timings: WordTimings,
    learner_timings: WordTimings,
) -> ProsodyResult:
    return ProsodyResult(
        rhythm_match=rhythm_match(reference_timings, learner_timings),
        intonation_match=intonation_match(
            reference_pitch, learner_pitch, reference_timings, learner_timings
        ),
    )


def analyze_prosody(
    reference_pitch: PitchTrack,
    learner_pitch: PitchTrack,
    reference_timings: WordTimings,
    learner_timings: WordTimings,
    stress_marks: list[StressMark],
) -> ProsodyAnalysis:
    """The richer projection the stress-and-intonation surface draws. It carries
    the same two match scalars the scalar route returns, plus both pitch contours
    resampled onto the shared linguistic timeline, the reference word timings, and
    the expected stress marks, so the client can draw the pitch shapes aligned by
    sentence position rather than reduce them to a number."""
    result = compare_prosody(
        reference_pitch, learner_pitch, reference_timings, learner_timings
    )
    return ProsodyAnalysis(
        rhythm_match=result.rhythm_match,
        intonation_match=result.intonation_match,
        reference_contour=word_timed_contour(reference_pitch, reference_timings),
        learner_contour=word_timed_contour(learner_pitch, learner_timings),
        reference_timings=reference_timings,
        stress_marks=stress_marks,
    )


def intonation_match(
    reference_pitch: PitchTrack,
    learner_pitch: PitchTrack,
    reference_timings: WordTimings,
    learner_timings: WordTimings,
) -> float:
    """Compare two pitch contours by melodic shape on a shared linguistic
    timeline. Each contour is reduced to its voiced frames, converted to
    semitones around its own median, placed at its position in the spoken words,
    and resampled to a common length, so the score reflects the rise-and-fall
    pattern at matching points in the sentence rather than at matching frame
    indices. A flat delivery against a varied reference scores low, and a match
    at a different tempo still scores high."""
    reference = word_timed_contour(reference_pitch, reference_timings)
    learner = word_timed_contour(learner_pitch, learner_timings)
    if not reference or not learner:
        return 0.0
    deviation = _rms_difference(reference, learner)
    return _tolerance_score(deviation, INTONATION_TOLERANCE_SEMITONES)


def rhythm_match(
    reference_timings: WordTimings,
    learner_timings: WordTimings,
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


def word_timed_contour(
    pitch: PitchTrack,
    timings: WordTimings,
    points: int = CONTOUR_RESAMPLE_POINTS,
) -> list[float]:
    """Reduce a pitch track to a fixed-length semitone contour on a shared
    linguistic timeline. Voiced frames are converted to semitones around the
    track's own median, each is placed at its normalized position in the spoken
    words, and the result is resampled onto an even grid over that [0, 1]
    timeline. Two readings of the same text land on the same grid, so contour
    point i is the same point in the sentence for both."""
    voiced = [(time, frequency) for time, frequency in pitch if frequency > 0.0]
    if not voiced:
        return []
    median = _median([frequency for _, frequency in voiced])
    if median <= 0.0:
        return []
    position_of = _position_mapper(timings, [time for time, _ in voiced])
    positioned = [
        (position_of(time), 12.0 * math.log2(frequency / median))
        for time, frequency in voiced
    ]
    positioned.sort(key=lambda sample: sample[0])
    return _resample_over_positions(positioned, points)


def median_smooth(values: list[float], window: int) -> list[float]:
    """Median-filter a series to drop the octave jumps and single-frame spikes a
    naive pitch tracker emits. A window of one, or a series shorter than the
    window, returns the input unchanged."""
    if window <= 1 or len(values) < window:
        return list(values)
    half = window // 2
    smoothed: list[float] = []
    for index in range(len(values)):
        lower = max(0, index - half)
        upper = min(len(values), index + half + 1)
        smoothed.append(_median(values[lower:upper]))
    return smoothed


def apply_voicing(
    frequencies: list[float], energies: list[float], energy_ratio: float
) -> list[float]:
    """Zero out low-energy frames so the contour tracks only voiced speech. A
    frame whose energy is below `energy_ratio` of the loudest frame is treated as
    unvoiced, since the naive tracker still reports a pitch for near-silence."""
    if not energies:
        return list(frequencies)
    threshold = max(energies) * energy_ratio
    return [
        frequency if energy >= threshold else 0.0
        for frequency, energy in zip(frequencies, energies, strict=True)
    ]


def build_stress_marks(
    words: list[str], syllables_per_word: list[list[str]]
) -> list[StressMark]:
    """Place a stress mark on each reference word from its espeak syllables. The
    primary-stress diacritic wins, the secondary falls back to it, and a word
    with neither is marked on its first syllable. The diacritics are stripped
    from the displayed syllables, since the highlight already carries the stress.
    Model-free so it is unit-tested on synthetic syllable input."""
    return [
        _stress_mark(word, syllables)
        for word, syllables in zip(words, syllables_per_word, strict=True)
    ]


def _stress_mark(word: str, syllables: list[str]) -> StressMark:
    index = _stressed_syllable_index(syllables)
    cleaned = [_strip_stress(syllable) for syllable in syllables]
    return StressMark(word=word, syllables=cleaned, stress_index=index)


def _stressed_syllable_index(syllables: list[str]) -> int:
    for marker in (PRIMARY_STRESS, SECONDARY_STRESS):
        for index, syllable in enumerate(syllables):
            if marker in syllable:
                return index
    return 0


def _strip_stress(syllable: str) -> str:
    return syllable.replace(PRIMARY_STRESS, '').replace(SECONDARY_STRESS, '').strip()


def _position_mapper(
    timings: WordTimings, times: list[float]
) -> Callable[[float], float]:
    """Choose how to place a frame time on the [0, 1] timeline. With word timings
    the position is anchored on the words, so equal-word readings align by
    sentence position. Without them it falls back to the fraction of the track's
    own spoken span, which still keys on time rather than voiced-frame index."""
    if timings:
        return lambda time: _word_position(time, timings)
    span_start = min(times)
    span = max(times) - span_start
    if span <= 0.0:
        return lambda time: 0.0
    return lambda time: (time - span_start) / span


def _word_position(time: float, timings: WordTimings) -> float:
    """Map a time in seconds to its normalized position in the spoken words, in
    [0, 1]. Word k occupies the slice [k / count, (k + 1) / count], and time
    within a word is linear across the word, so equal-word readings align by
    sentence position regardless of tempo."""
    count = len(timings)
    first_start = timings[0][0]
    last_end = timings[-1][1]
    if time <= first_start:
        return 0.0
    if time >= last_end:
        return 1.0
    for index, (start, end) in enumerate(timings):
        if time < start:
            return index / count
        if time <= end:
            span = end - start
            fraction = (time - start) / span if span > 0.0 else 0.0
            return (index + fraction) / count
    return 1.0


def _resample_over_positions(
    samples: list[tuple[float, float]], count: int
) -> list[float]:
    """Resample position-tagged values onto an even grid over [0, 1]. `samples`
    is sorted by position. Each grid point is linearly interpolated between its
    bracketing samples, clamping to the ends outside the sampled span."""
    if not samples:
        return []
    if len(samples) == 1:
        return [samples[0][1]] * count
    resampled: list[float] = []
    cursor = 0
    for step in range(count):
        target = step / (count - 1)
        while cursor < len(samples) - 2 and samples[cursor + 1][0] < target:
            cursor += 1
        left_position, left_value = samples[cursor]
        right_position, right_value = samples[cursor + 1]
        if target <= left_position:
            resampled.append(left_value)
        elif target >= right_position:
            resampled.append(right_value)
        else:
            span = right_position - left_position
            weight = (target - left_position) / span if span > 0.0 else 0.0
            resampled.append(left_value * (1.0 - weight) + right_value * weight)
    return resampled


def _duration_fractions(timings: WordTimings) -> list[float]:
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
