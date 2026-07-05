from typing import Protocol

from diction.scoring.prosody import ProsodyResult


class ProsodyScorer(Protocol):
    def score(self, reference_audio: bytes, learner_audio: bytes) -> ProsodyResult: ...


class StubProsodyScorer:
    """Canned prosody scores behind the real contract. Used in CI, where there
    is no GPU and no model download. Deterministic so e2e assertions stay
    stable."""

    def score(self, reference_audio: bytes, learner_audio: bytes) -> ProsodyResult:
        return ProsodyResult(rhythm_match=88.0, intonation_match=84.0)
