"""The real prosody scorer. Imports torch, torchaudio, and faster-whisper, all
in the optional `scoring` dependency group, and only inside this module so
importing the scorer protocol or the stub never pulls them in.

Pitch comes from `torchaudio.functional.detect_pitch_frequency`, a model-free
tracker already reachable through the resident torchaudio, so no new model
loads for the f0 contour. Word timings come from faster-whisper.

Two real-stack tasks are deferred to the spike's hands-on validation, both
requiring the GPU box this code cannot reach in CI. First, the extractor loads
its own Whisper instance; the GOP scorer already holds one, and sharing a single
instance to halve the resident VRAM is pending the VRAM-footprint measurement in
`.claude/ARCHITECTURE.md`. Second, `detect_pitch_frequency` is naive and can
return garbage f0 on a noisy mic recording; the contour must be validated on
real native and non-native recordings before the intonation score is trusted.
"""

import io
from dataclasses import dataclass

import numpy as np
import torch
import torchaudio.functional
from faster_whisper import WhisperModel

from diction.config import Settings
from diction.scoring.audio import (
    MIN_CLIP_SECONDS,
    TARGET_SAMPLE_RATE,
    decode_audio,
    ensure_scorable,
)
from diction.scoring.prosody import ProsodyResult, compare_prosody


@dataclass(frozen=True, slots=True)
class _ClipAnalysis:
    pitch: list[float]
    timings: list[tuple[float, float]]


class ProsodyScorer:
    def __init__(self, settings: Settings) -> None:
        self._device = 'cuda' if torch.cuda.is_available() else 'cpu'
        compute_type = 'float16' if self._device == 'cuda' else 'int8'
        self._whisper = WhisperModel(
            settings.whisper_model_id,
            device=self._device,
            compute_type=compute_type,
        )

    def score(
        self,
        reference_audio: bytes,
        learner_audio: bytes,
        min_clip_seconds: float = MIN_CLIP_SECONDS,
    ) -> ProsodyResult:
        reference = self._analyze(reference_audio)
        learner = self._analyze(learner_audio, min_clip_seconds=min_clip_seconds)
        return compare_prosody(
            reference_pitch=reference.pitch,
            learner_pitch=learner.pitch,
            reference_timings=reference.timings,
            learner_timings=learner.timings,
        )

    def _analyze(
        self, audio: bytes, min_clip_seconds: float | None = None
    ) -> _ClipAnalysis:
        decoded = decode_audio(audio)
        if min_clip_seconds is not None:
            ensure_scorable(decoded, min_seconds=min_clip_seconds)
        waveform = np.frombuffer(decoded.samples.tobytes(), dtype=np.float32)
        return _ClipAnalysis(
            pitch=self._pitch(waveform),
            timings=self._timings(audio),
        )

    def _pitch(self, waveform: np.ndarray) -> list[float]:
        tensor = torch.from_numpy(waveform.copy()).unsqueeze(0)
        frequencies = torchaudio.functional.detect_pitch_frequency(
            tensor, TARGET_SAMPLE_RATE
        )
        return [float(frequency) for frequency in frequencies.squeeze(0)]

    def _timings(self, audio: bytes) -> list[tuple[float, float]]:
        segments, _ = self._whisper.transcribe(io.BytesIO(audio), word_timestamps=True)
        return [
            (word.start, word.end)
            for segment in segments
            for word in (segment.words or [])
        ]
