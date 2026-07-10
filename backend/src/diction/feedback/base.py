from typing import Protocol

from diction.feedback.types import Critique, FlaggedWordContext

MAX_CRITIQUE_POINTS = 3
MAX_GENERATED_PASSAGE_LENGTH = 500
MAX_FOCUS_PHONEMES = 12


def default_passage() -> str:
    return (
        'The morning light spread slowly across the quiet valley. '
        'A cool breeze carried the smell of fresh rain through the open window. '
        'She poured a cup of tea, opened her book, and began to read aloud, '
        'letting each word settle before she moved on to the next.'
    )


def default_explanation(word: str, phoneme: str) -> str:
    return (
        f"The /{phoneme}/ sound in '{word}' scored low. "
        f'Listen to the native reference and compare.'
    )


def default_critique() -> Critique:
    return Critique(
        points=(
            'Grammar and phrasing feedback is unavailable right now, '
            'the pronunciation scores above still apply.',
        )
    )


class Explainer(Protocol):
    def explain(self, flagged_words: list[FlaggedWordContext]) -> list[str]: ...


class StubExplainer:
    """Deterministic canned explanations behind the real contract. Used in CI,
    where there is no local LLM, and kept deterministic so the e2e score and
    history assertions stay stable. One explanation per flagged word, in order."""

    def explain(self, flagged_words: list[FlaggedWordContext]) -> list[str]:
        return [default_explanation(flag.word, flag.phoneme) for flag in flagged_words]


class Critic(Protocol):
    def critique(self, transcript: str, topic: str | None) -> Critique: ...


class StubCritic:
    """Deterministic canned grammar-and-phrasing critique behind the real contract.
    Used in CI and e2e, where there is no local LLM, and kept deterministic so the
    free-topic route assertions stay stable. Session-level prose, not per-word."""

    def critique(self, transcript: str, topic: str | None) -> Critique:
        return Critique(
            points=(
                'Subject-verb agreement: say "my friend and I were walking", '
                'not "me and my friend was walking".',
                'Keep the tense consistent, use "we decided" and "it started" '
                'to match the past-tense narration.',
                'Vary sentence openings instead of starting clauses with "and".',
            )
        )


class ContentGenerator(Protocol):
    def generate(self, focus_phonemes: list[str]) -> str: ...


class StubContentGenerator:
    """Deterministic canned passage behind the real contract. Used in CI, where
    there is no local LLM, and kept deterministic so the e2e generation
    assertions stay stable. Ignores the focus phonemes, which only bias the
    real model."""

    def generate(self, focus_phonemes: list[str]) -> str:
        return default_passage()
