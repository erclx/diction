"""Shared Whisper word-timing extraction. The GOP scorer and the prosody scorer
both need word-level timings, and Whisper large-v3 is large enough that a second
instance would double its VRAM on a card already near the ceiling. One instance
loads here from the lifespan and both scorers share it.

Imports faster-whisper, in the optional `scoring` dependency group, only inside
this module, per `.claude/rules/lib/360-model-runtime.md`.
"""

import io

import torch
from faster_whisper import WhisperModel

from diction.config import Settings
from diction.scoring.transcription_base import Transcript


class WhisperTranscriber:
    def __init__(self, settings: Settings) -> None:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        compute_type = 'float16' if device == 'cuda' else 'int8'
        self._model = WhisperModel(
            settings.whisper_model_id,
            device=device,
            compute_type=compute_type,
        )

    def transcribe(self, audio: bytes, prompt: str | None = None) -> Transcript:
        """Full transcript text plus word-level timings from one decode. Free-topic
        scores the clip against `text` as its reference and feeds the same `text` to
        the grammar critique, so both read a single decode. `prompt` biases decoding
        toward a known vocabulary via `initial_prompt`, which the drill uses to
        recognize a short isolated word Whisper would otherwise get wrong. Passage,
        prosody, and free-topic callers leave it unset for an unbiased transcription."""
        segments, _ = self._model.transcribe(
            io.BytesIO(audio),
            word_timestamps=True,
            initial_prompt=prompt,
            beam_size=5,
        )
        materialized = list(segments)
        text = ''.join(segment.text for segment in materialized).strip()
        words = [
            (word.word, word.start, word.end)
            for segment in materialized
            for word in (segment.words or [])
        ]
        return Transcript(text=text, words=words)

    def word_timings(
        self, audio: bytes, prompt: str | None = None
    ) -> list[tuple[str, float, float]]:
        return self.transcribe(audio, prompt).words
