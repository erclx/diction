"""Transcriber contract and its stub, kept free of the `scoring` model stack so
importing the protocol or the stub never pulls in torch or faster-whisper, per
`.claude/rules/lib/360-model-runtime.md`. The real `WhisperTranscriber` lives in
`transcription.py` and imports `Transcript` from here.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class Transcript:
    text: str
    words: list[tuple[str, float, float]]


class Transcriber(Protocol):
    def transcribe(self, audio: bytes, prompt: str | None = None) -> Transcript: ...

    def word_timings(
        self, audio: bytes, prompt: str | None = None
    ) -> list[tuple[str, float, float]]: ...


class StubTranscriber:
    """Canned transcript behind the real contract. Used in CI and e2e, where there
    is no GPU and no Whisper download. Deterministic so free-topic assertions stay
    stable. The text carries a planted grammar slip so the critique stub has
    something plausible to react to."""

    _TEXT = (
        'Yesterday me and my friend was walking to the park, and we decide to '
        'buy some coffee before it start raining.'
    )
    _WORDS: list[tuple[str, float, float]] = [
        ('Yesterday', 0.00, 0.55),
        ('me', 0.55, 0.75),
        ('and', 0.75, 0.90),
        ('my', 0.90, 1.05),
        ('friend', 1.05, 1.40),
        ('was', 1.40, 1.65),
        ('walking', 1.65, 2.05),
    ]

    def transcribe(self, audio: bytes, prompt: str | None = None) -> Transcript:
        return Transcript(text=self._TEXT, words=list(self._WORDS))

    def word_timings(
        self, audio: bytes, prompt: str | None = None
    ) -> list[tuple[str, float, float]]:
        return self.transcribe(audio, prompt).words
