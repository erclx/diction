from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class FlaggedWordContext:
    word: str
    phoneme: str
