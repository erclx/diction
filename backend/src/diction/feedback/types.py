from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class FlaggedWordContext:
    word: str
    phoneme: str


@dataclass(frozen=True, slots=True)
class Critique:
    points: tuple[str, ...]
