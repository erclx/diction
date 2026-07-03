import hashlib
from pathlib import Path

from diction.tts.base import Synthesizer


def cache_key(text: str, voice: str) -> str:
    return hashlib.sha256(f'{voice}\n{text}'.encode()).hexdigest()


class ReferenceAudioCache:
    """Disk cache for synthesized reference clips, keyed by a hash of the text
    and the voice. The fixed passage and repeated words synthesize once, and the
    files stay local per the offline constraint in `.claude/REQUIREMENTS.md`."""

    def __init__(self, directory: Path) -> None:
        self._directory = directory

    def path_for(self, text: str, voice: str) -> Path:
        return self._directory / f'{cache_key(text, voice)}.wav'

    def get(self, text: str, voice: str) -> bytes | None:
        path = self.path_for(text, voice)
        if not path.exists():
            return None
        return path.read_bytes()

    def put(self, text: str, voice: str, audio: bytes) -> None:
        self._directory.mkdir(parents=True, exist_ok=True)
        path = self.path_for(text, voice)
        temp_path = path.with_name(f'{path.name}.tmp')
        temp_path.write_bytes(audio)
        temp_path.replace(path)


class CachedSynthesizer:
    """Wraps a real `Synthesizer` with a disk cache, so repeated text is served
    from disk instead of re-synthesized. The stub bypasses this, since it is
    already deterministic and instant."""

    def __init__(
        self, inner: Synthesizer, cache: ReferenceAudioCache, voice: str
    ) -> None:
        self._inner = inner
        self._cache = cache
        self._voice = voice

    def synthesize(self, text: str) -> bytes:
        cached = self._cache.get(text, self._voice)
        if cached is not None:
            return cached
        audio = self._inner.synthesize(text)
        self._cache.put(text, self._voice, audio)
        return audio
