import math
from typing import Protocol

from diction.scoring.prosody import (
    CONTOUR_RESAMPLE_POINTS,
    ProsodyAnalysis,
    ProsodyResult,
    StressMark,
)


class ProsodyScorer(Protocol):
    def score(self, reference_audio: bytes, learner_audio: bytes) -> ProsodyResult: ...

    def analyze(
        self, reference_text: str, reference_audio: bytes, learner_audio: bytes
    ) -> ProsodyAnalysis: ...


def _canned_contour(phase: float) -> list[float]:
    step = 2.0 * math.pi / CONTOUR_RESAMPLE_POINTS
    return [
        round(4.0 * math.sin(index * step + phase), 4)
        for index in range(CONTOUR_RESAMPLE_POINTS)
    ]


_CANNED_STRESS_MARKS = [
    StressMark(word='the', syllables=['ðə'], stress_index=0),
    StressMark(word='thick', syllables=['θɪk'], stress_index=0),
    StressMark(word='banana', syllables=['bə', 'nɑː', 'nə'], stress_index=1),
]


class StubProsodyScorer:
    """Canned prosody output behind the real contract. Used in CI, where there
    is no GPU and no model download. Deterministic so e2e assertions stay
    stable."""

    def score(self, reference_audio: bytes, learner_audio: bytes) -> ProsodyResult:
        return ProsodyResult(rhythm_match=88.0, intonation_match=84.0)

    def analyze(
        self, reference_text: str, reference_audio: bytes, learner_audio: bytes
    ) -> ProsodyAnalysis:
        return ProsodyAnalysis(
            rhythm_match=88.0,
            intonation_match=84.0,
            reference_contour=_canned_contour(0.0),
            learner_contour=_canned_contour(0.6),
            reference_timings=[(0.0, 0.3), (0.3, 0.7), (0.7, 1.4)],
            stress_marks=_CANNED_STRESS_MARKS,
        )
