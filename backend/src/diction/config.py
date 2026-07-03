from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix='DICTION_', env_file=BACKEND_ROOT / '.env', extra='ignore'
    )

    db_path: Path = BACKEND_ROOT / 'diction.db'
    use_stub_scorer: bool = False
    use_stub_explainer: bool = False

    phoneme_model_id: str = 'facebook/wav2vec2-xlsr-53-espeak-cv-ft'
    whisper_model_id: str = 'large-v3'

    llm_model_id: str = 'gemma4:26b'
    ollama_base_url: str = 'http://localhost:11434'
    llm_timeout_seconds: float = 30.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
