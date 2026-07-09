import io
import math
import struct
import wave
from functools import lru_cache
from typing import Protocol

STUB_SAMPLE_RATE = 22_050
STUB_DURATION_SECONDS = 0.4
STUB_FREQUENCY_HZ = 220.0
STUB_AMPLITUDE = 0.3


class Synthesizer(Protocol):
    def synthesize(self, text: str, voice: str | None = None) -> bytes: ...


class StubSynthesizer:
    """A short canned tone behind the real contract. Used in CI and e2e, where
    there is no TTS voice download. Deterministic so playback assertions stay
    stable, and a valid 22.05 kHz mono wav so the browser plays it directly. The
    voice is ignored, since the stub renders one fixed tone."""

    def synthesize(self, text: str, voice: str | None = None) -> bytes:
        return _canned_wav()


@lru_cache(maxsize=1)
def _canned_wav() -> bytes:
    frame_count = int(STUB_SAMPLE_RATE * STUB_DURATION_SECONDS)
    frames = bytearray()
    for index in range(frame_count):
        angle = 2 * math.pi * STUB_FREQUENCY_HZ * index / STUB_SAMPLE_RATE
        sample = int(STUB_AMPLITUDE * 32767 * math.sin(angle))
        frames += struct.pack('<h', sample)

    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(STUB_SAMPLE_RATE)
        wav_file.writeframes(bytes(frames))
    return buffer.getvalue()
