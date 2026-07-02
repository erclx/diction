"""Audio ingestion at the request boundary. The browser sends webm/opus, not
WAV, so ffmpeg decodes and normalizes to 16 kHz mono float. Stdlib only, so the
too-weak check is unit-tested without numpy, soundfile, or a model download.
"""

from __future__ import annotations

import array
import subprocess
from dataclasses import dataclass

TARGET_SAMPLE_RATE = 16_000
MIN_CLIP_SECONDS = 1.0
MIN_CLIP_RMS = 0.005


class ClipTooWeakError(Exception):
    """Clip is undecodable, too short, or too quiet to score. Distinct from a
    low score, and surfaced to the client as an actionable error."""


@dataclass(frozen=True, slots=True)
class DecodedAudio:
    samples: array.array[float]  # float32 mono at TARGET_SAMPLE_RATE
    sample_rate: int

    @property
    def duration(self) -> float:
        return len(self.samples) / self.sample_rate


def decode_audio(data: bytes) -> DecodedAudio:
    try:
        result = subprocess.run(
            [
                'ffmpeg',
                '-hide_banner',
                '-loglevel',
                'error',
                '-i',
                'pipe:0',
                '-f',
                'f32le',
                '-ac',
                '1',
                '-ar',
                str(TARGET_SAMPLE_RATE),
                'pipe:1',
            ],
            input=data,
            capture_output=True,
            timeout=60,
        )
    except (OSError, subprocess.SubprocessError) as error:
        raise ClipTooWeakError('could not decode audio') from error
    if result.returncode != 0 or not result.stdout:
        raise ClipTooWeakError('could not decode audio')
    samples = array.array('f')
    samples.frombytes(result.stdout)
    return DecodedAudio(samples=samples, sample_rate=TARGET_SAMPLE_RATE)


def ensure_scorable(audio: DecodedAudio) -> None:
    if audio.duration < MIN_CLIP_SECONDS:
        raise ClipTooWeakError(
            f'duration={audio.duration:.2f}s below {MIN_CLIP_SECONDS}s minimum'
        )
    rms = _rms(audio.samples)
    if rms < MIN_CLIP_RMS:
        raise ClipTooWeakError(f'rms={rms:.4f} below {MIN_CLIP_RMS} minimum')


def _rms(samples: array.array[float]) -> float:
    if not samples:
        return 0.0
    return float((sum(sample * sample for sample in samples) / len(samples)) ** 0.5)
