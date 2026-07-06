"""The real prosody scorer. Imports torch and torchaudio, in the optional
`scoring` dependency group, only inside this module so importing the scorer
protocol or the stub never pulls them in.

Pitch comes from `torchaudio.functional.detect_pitch_frequency`, a model-free
tracker already reachable through the resident torchaudio, so no new model
loads for the f0 contour. Word timings come from the shared `WhisperTranscriber`
the GOP scorer also uses, so the prosody path adds no second Whisper instance.

One real-stack task is deferred to the spike's hands-on validation on the GPU
box this code cannot reach in CI: `detect_pitch_frequency` is naive and can
return garbage f0 on a noisy mic recording, so the contour must be validated on
real native and non-native recordings, and the voiced-frame index comparison may
need to key on time instead, before the intonation score is trusted.
"""

from dataclasses import dataclass

import numpy as np
import torch
import torchaudio.functional
from phonemizer import phonemize
from phonemizer.separator import Separator

from diction.config import Settings
from diction.scoring.audio import (
    MIN_CLIP_SECONDS,
    TARGET_SAMPLE_RATE,
    decode_audio,
    ensure_scorable,
)
from diction.scoring.prosody import (
    ProsodyAnalysis,
    ProsodyResult,
    analyze_prosody,
    build_stress_marks,
    compare_prosody,
)
from diction.scoring.transcription import WhisperTranscriber


@dataclass(frozen=True, slots=True)
class _ClipAnalysis:
    pitch: list[float]
    timings: list[tuple[float, float]]


class ProsodyScorer:
    def __init__(self, settings: Settings, transcriber: WhisperTranscriber) -> None:
        self._transcriber = transcriber

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

    def analyze(
        self,
        reference_text: str,
        reference_audio: bytes,
        learner_audio: bytes,
        min_clip_seconds: float = MIN_CLIP_SECONDS,
    ) -> ProsodyAnalysis:
        reference = self._analyze(reference_audio)
        learner = self._analyze(learner_audio, min_clip_seconds=min_clip_seconds)
        words, syllables = self._syllables(reference_text)
        return analyze_prosody(
            reference_pitch=reference.pitch,
            learner_pitch=learner.pitch,
            reference_timings=reference.timings,
            learner_timings=learner.timings,
            stress_marks=build_stress_marks(words, syllables),
        )

    def _syllables(self, text: str) -> tuple[list[str], list[list[str]]]:
        words = [word for word in text.split() if word]
        if not words:
            return [], []
        phonemized = phonemize(
            words,
            language='en-us',
            backend='espeak',
            separator=Separator(phone='', syllable=' ', word='|'),
            strip=True,
            with_stress=True,
        )
        syllables_per_word = [
            [syllable for syllable in line.split(' ') if syllable]
            for line in phonemized
        ]
        return words, syllables_per_word

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
        return [(start, end) for _, start, end in self._transcriber.word_timings(audio)]
