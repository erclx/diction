from typing import Protocol

from diction.scoring.types import FlaggedWordResult, ScoreResult


class PassageScorer(Protocol):
    def score(self, passage: str, audio: bytes) -> ScoreResult: ...


class StubScorer:
    """Canned scores behind the real contract. Used in CI, where there is no GPU
    and no model download. Deterministic so e2e assertions stay stable."""

    def score(self, passage: str, audio: bytes) -> ScoreResult:
        return ScoreResult(
            completeness=92.0,
            accuracy=88.0,
            fluency=95.0,
            phoneme_quality=90.0,
            flagged_words=[
                FlaggedWordResult(word='thought', start=1.20, end=1.55, phoneme='θ')
            ],
        )
