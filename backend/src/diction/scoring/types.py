from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class FlaggedWordResult:
    word: str
    start: float
    end: float
    phoneme: str


@dataclass(frozen=True, slots=True)
class ScoreResult:
    completeness: float
    accuracy: float
    fluency: float
    phoneme_quality: float
    flagged_words: list[FlaggedWordResult]


@dataclass(frozen=True, slots=True)
class ContrastResult:
    """A minimal-pair drill verdict. `target_substituted` is True when the
    competing phoneme scored higher than the target at the target's own slot,
    meaning the speaker produced the wrong sound of the contrast."""

    phoneme_quality: float
    target_substituted: bool
