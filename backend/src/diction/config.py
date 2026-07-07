from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent

USER_DATA_DIR = BACKEND_ROOT / 'data'
DEV_DATA_DIR = BACKEND_ROOT / '.dev-data'
DB_FILENAME = 'diction.db'
RECORDINGS_DIRNAME = 'recordings'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix='DICTION_', env_file=BACKEND_ROOT / '.env', extra='ignore'
    )

    run_mode: Literal['user', 'dev'] = 'user'
    db_path: Path | None = None
    recordings_dir: Path | None = None
    use_stub_scorer: bool = False
    use_stub_prosody: bool = False
    use_stub_explainer: bool = False
    use_stub_synth: bool = False

    phoneme_model_id: str = 'facebook/wav2vec2-xlsr-53-espeak-cv-ft'
    whisper_model_id: str = 'large-v3'

    llm_model_id: str = 'gemma2:9b'
    ollama_base_url: str = 'http://localhost:11434'
    llm_timeout_seconds: float = 30.0

    tts_voice: Path = BACKEND_ROOT / 'voices' / 'en_US-lessac-medium.onnx'
    reference_cache_dir: Path = BACKEND_ROOT / '.cache' / 'reference-audio'

    @property
    def data_dir(self) -> Path:
        return DEV_DATA_DIR if self.run_mode == 'dev' else USER_DATA_DIR

    @property
    def resolved_db_path(self) -> Path:
        return self.db_path if self.db_path is not None else self.data_dir / DB_FILENAME

    @property
    def resolved_recordings_dir(self) -> Path:
        if self.recordings_dir is not None:
            return self.recordings_dir
        return self.data_dir / RECORDINGS_DIRNAME

    @property
    def user_db_path(self) -> Path:
        return USER_DATA_DIR / DB_FILENAME


@lru_cache
def get_settings() -> Settings:
    return Settings()
