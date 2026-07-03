"""The real Piper-backed synthesizer. Imports `piper`, in the optional `tts`
dependency group, kept in its own module so importing the synth protocol or the
stub never pulls it in.

The voice loads once at construction, driven from the app lifespan. Synthesis is
blocking and must run in a threadpool, never inside an async handler, per
`.claude/rules/framework/220-fastapi.md`.
"""

import io
import wave

from piper import PiperVoice

from diction.config import Settings


class PiperSynthesizer:
    def __init__(self, settings: Settings) -> None:
        self._voice = PiperVoice.load(str(settings.tts_voice))

    def synthesize(self, text: str) -> bytes:
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wav_file:
            self._voice.synthesize_wav(text, wav_file)
        return buffer.getvalue()
