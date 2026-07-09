"""The real Kokoro-backed synthesizer. Imports `kokoro`, in the optional `tts`
dependency group, kept in its own module so importing the synth protocol or the
stub never pulls it in.

The pipeline loads once at construction, driven from the app lifespan, and
self-downloads `hexgrad/Kokoro-82M` from HuggingFace on first use. Synthesis is
blocking and must run in a threadpool, never inside an async handler, per
`.claude/rules/framework/220-fastapi.md`.
"""

import io
import wave

import numpy as np
from kokoro import KPipeline

from diction.config import Settings

KOKORO_SAMPLE_RATE = 24_000
KOKORO_LANG_CODE = 'a'


class KokoroSynthesizer:
    def __init__(self, settings: Settings) -> None:
        self._pipeline = KPipeline(lang_code=KOKORO_LANG_CODE)
        self._voice = settings.tts_voice

    def synthesize(self, text: str) -> bytes:
        chunks = [
            np.asarray(result.audio, dtype=np.float32)
            for result in self._pipeline(text, voice=self._voice)
        ]
        samples = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)
        pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype('<i2')

        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(KOKORO_SAMPLE_RATE)
            wav_file.writeframes(pcm.tobytes())
        return buffer.getvalue()
