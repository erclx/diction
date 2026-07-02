from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix='DICTION_')

    db_path: Path = BACKEND_ROOT / 'diction.db'


@lru_cache
def get_settings() -> Settings:
    return Settings()
