"""Pure, reference-free fluency scoring. No model, numpy, or GPU imports, so this
core is unit-tested against synthetic word timings without any download.

Fluency is built from the learner's own delivery, not a comparison to a native
rendering: passage scoring aligns against expected text, not a reference clip, so
there is no reference timing to compare against at score time. Four features come
from the shared Whisper word timings the GOP scorer already produces, which carry
real inter-word gaps, unlike the near-contiguous forced-aligned spans that pushed
the old pause-ratio proxy to 100 for every read:

- articulation rate: words per second of articulated speech
- long-pause ratio: fraction of the clip spent in hesitation pauses
- pause rate: hesitation pauses per word
- duration variation: coefficient of variation of word durations, the halting-
  versus-even rhythm signal, the same per-word-duration measure `prosody.py` uses

The model is a linear map from standardized features to a 0..100 score. Its
centers, scales, weights, and intercept are placeholders carried until the
speechocean762 fluency fit lands, the same calibration discipline the GOP
threshold and the prosody tolerances follow. `calibration/fluency_eval.py` refits
them against the corpus fluency labels and validates held-out. Until then the
score is directional, not a settled grade.
"""

from dataclasses import dataclass
from statistics import mean, pstdev

LONG_PAUSE_SECONDS = 0.3

WordSpans = list[tuple[float, float]]


@dataclass(frozen=True, slots=True)
class FluencyFeatures:
    articulation_rate: float
    long_pause_ratio: float
    pause_rate: float
    duration_variation: float


@dataclass(frozen=True, slots=True)
class FeatureWeight:
    center: float
    scale: float
    weight: float


FLUENCY_INTERCEPT = 82.0
FLUENCY_WEIGHTS: dict[str, FeatureWeight] = {
    'articulation_rate': FeatureWeight(center=3.0, scale=1.0, weight=8.0),
    'long_pause_ratio': FeatureWeight(center=0.05, scale=0.1, weight=-22.0),
    'pause_rate': FeatureWeight(center=0.1, scale=0.2, weight=-14.0),
    'duration_variation': FeatureWeight(center=0.5, scale=0.3, weight=-10.0),
}


def extract_fluency_features(
    word_spans: WordSpans, duration: float
) -> FluencyFeatures | None:
    """Derive the reference-free timing features from Whisper word spans, or None
    when the clip is too short to measure a rhythm. Fewer than two words gives no
    inter-word gap and no rate, and a non-positive duration or speech time cannot
    normalize, so the caller scores those as the floor rather than guessing."""
    if len(word_spans) < 2 or duration <= 0.0:
        return None
    durations = [max(0.0, end - start) for start, end in word_spans]
    speech_time = sum(durations)
    mean_duration = mean(durations)
    if speech_time <= 0.0 or mean_duration <= 0.0:
        return None
    long_pauses = [
        gap for gap in _inter_word_gaps(word_spans) if gap >= LONG_PAUSE_SECONDS
    ]
    return FluencyFeatures(
        articulation_rate=len(word_spans) / speech_time,
        long_pause_ratio=sum(long_pauses) / duration,
        pause_rate=len(long_pauses) / len(word_spans),
        duration_variation=pstdev(durations) / mean_duration,
    )


def score_fluency(features: FluencyFeatures) -> float:
    """Map the standardized features onto a 0..100 fluency through the calibrated
    linear model. A typical even read lands in the 80s rather than pinning at 100,
    and each added pause, slowdown, or erratic word length pulls the score down."""
    score = FLUENCY_INTERCEPT
    for name, term in FLUENCY_WEIGHTS.items():
        value = getattr(features, name)
        score += term.weight * (value - term.center) / term.scale
    return max(0.0, min(100.0, score))


def fluency(word_spans: WordSpans, duration: float) -> float:
    features = extract_fluency_features(word_spans, duration)
    if features is None:
        return 0.0
    return score_fluency(features)


def _inter_word_gaps(word_spans: WordSpans) -> list[float]:
    return [
        max(0.0, word_spans[index][0] - word_spans[index - 1][1])
        for index in range(1, len(word_spans))
    ]
