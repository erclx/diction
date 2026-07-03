from typing import Protocol

from diction.feedback.types import FlaggedWordContext


def default_explanation(word: str, phoneme: str) -> str:
    return (
        f"The /{phoneme}/ sound in '{word}' scored low. "
        f'Listen to the native reference and compare.'
    )


class Explainer(Protocol):
    def explain(self, flagged_words: list[FlaggedWordContext]) -> list[str]: ...


class StubExplainer:
    """Deterministic canned explanations behind the real contract. Used in CI,
    where there is no local LLM, and kept deterministic so the e2e score and
    history assertions stay stable. One explanation per flagged word, in order."""

    def explain(self, flagged_words: list[FlaggedWordContext]) -> list[str]:
        return [default_explanation(flag.word, flag.phoneme) for flag in flagged_words]
