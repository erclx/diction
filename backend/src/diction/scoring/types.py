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
