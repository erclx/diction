"""The real prosody scorer. Imports torch and torchaudio, in the optional
`scoring` dependency group, only inside this module so importing the scorer
protocol or the stub never pulls them in.

Pitch comes from `torchaudio.functional.detect_pitch_frequency`, a model-free
tracker already reachable through the resident torchaudio, so no new model
loads for the f0 contour. Word timings come from the shared `WhisperTranscriber`
the GOP scorer also uses, so the prosody path adds no second Whisper instance.

The tracker is naive and reports a pitch even for near-silence, so the raw f0 is
median-smoothed to drop octave jumps and gated by frame energy so unvoiced frames
drop out. Each frame carries its timestamp, so `prosody.py` compares the two
contours on a shared linguistic timeline rather than by voiced-frame index, the
#21 open item. The remaining deferred task is calibrating the tolerances against
real native and non-native recordings before the numbers are shown as final.
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
    PitchTrack,
    ProsodyAnalysis,
    ProsodyResult,
    analyze_prosody,
    apply_voicing,
    build_stress_marks,
    compare_prosody,
    median_smooth,
)
from diction.scoring.transcription import WhisperTranscriber

PITCH_SMOOTH_WINDOW = 5
VOICING_ENERGY_RATIO = 0.15


@dataclass(frozen=True, slots=True)
class _ClipAnalysis:
    pitch: PitchTrack
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
            pitch=self._pitch(waveform, decoded.duration),
            timings=self._timings(audio),
        )

    def _pitch(self, waveform: np.ndarray, duration: float) -> PitchTrack:
        tensor = torch.from_numpy(waveform.copy()).unsqueeze(0)
        frequencies = torchaudio.functional.detect_pitch_frequency(
            tensor, TARGET_SAMPLE_RATE
        )
        raw = [float(frequency) for frequency in frequencies.squeeze(0)]
        smoothed = median_smooth(raw, PITCH_SMOOTH_WINDOW)
        energies = _frame_energies(waveform, len(smoothed))
        voiced = apply_voicing(smoothed, energies, VOICING_ENERGY_RATIO)
        return list(zip(_frame_times(len(voiced), duration), voiced, strict=True))

    def _timings(self, audio: bytes) -> list[tuple[float, float]]:
        return [(start, end) for _, start, end in self._transcriber.word_timings(audio)]


def _frame_energies(waveform: np.ndarray, frame_count: int) -> list[float]:
    """Per-frame RMS energy, one value per pitch frame, so voicing gates on the
    same grid as the f0 track. The waveform is split into `frame_count` equal
    chunks and each chunk's RMS is taken."""
    if frame_count <= 0 or waveform.size == 0:
        return []
    chunks = np.array_split(waveform, frame_count)
    return [
        float(np.sqrt(np.mean(np.square(chunk)))) if chunk.size else 0.0
        for chunk in chunks
    ]


def _frame_times(frame_count: int, duration: float) -> list[float]:
    """Evenly spaced timestamps across the clip, one per pitch frame, so each f0
    sample carries the moment it was taken."""
    if frame_count <= 0:
        return []
    if frame_count == 1:
        return [0.0]
    step = duration / (frame_count - 1)
    return [index * step for index in range(frame_count)]
