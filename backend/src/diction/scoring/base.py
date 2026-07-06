from typing import Protocol

from diction.scoring.audio import MIN_CLIP_SECONDS
from diction.scoring.types import ContrastResult, FlaggedWordResult, ScoreResult


class PassageScorer(Protocol):
    def score(
        self, passage: str, audio: bytes, min_clip_seconds: float = MIN_CLIP_SECONDS
    ) -> ScoreResult: ...

    def score_target_contrast(
        self,
        word: str,
        audio: bytes,
        target_phoneme: str,
        competitor_phoneme: str,
        min_clip_seconds: float = MIN_CLIP_SECONDS,
    ) -> ContrastResult: ...

    def recognize_word(self, audio: bytes, expected_words: list[str]) -> str: ...


class StubScorer:
    """Canned scores behind the real contract. Used in CI, where there is no GPU
    and no model download. Deterministic so e2e assertions stay stable."""

    def score(
        self, passage: str, audio: bytes, min_clip_seconds: float = MIN_CLIP_SECONDS
    ) -> ScoreResult:
        return ScoreResult(
            completeness=92.0,
            accuracy=88.0,
            fluency=95.0,
            phoneme_quality=90.0,
            flagged_words=[
                FlaggedWordResult(word='thought', start=1.20, end=1.55, phoneme='θ')
            ],
        )

    def score_target_contrast(
        self,
        word: str,
        audio: bytes,
        target_phoneme: str,
        competitor_phoneme: str,
        min_clip_seconds: float = MIN_CLIP_SECONDS,
    ) -> ContrastResult:
        return ContrastResult(phoneme_quality=90.0, target_substituted=False)

    def recognize_word(self, audio: bytes, expected_words: list[str]) -> str:
        return ''
