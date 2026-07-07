from pathlib import Path

from diction.config import (
    DEV_DATA_DIR,
    USER_DATA_DIR,
    Settings,
)
from diction.db.engine import reset_dev_database


def test_user_mode_resolves_paths_under_the_user_data_dir() -> None:
    settings = Settings(run_mode='user')

    assert settings.resolved_db_path == USER_DATA_DIR / 'diction.db'
    assert settings.resolved_recordings_dir == USER_DATA_DIR / 'recordings'


def test_dev_mode_resolves_paths_under_the_dev_data_dir() -> None:
    settings = Settings(run_mode='dev')

    assert settings.resolved_db_path == DEV_DATA_DIR / 'diction.db'
    assert settings.resolved_recordings_dir == DEV_DATA_DIR / 'recordings'


def test_explicit_db_path_overrides_the_mode_derived_path(tmp_path: Path) -> None:
    override = tmp_path / 'custom.db'
    settings = Settings(run_mode='dev', db_path=override)

    assert settings.resolved_db_path == override


def test_reset_dev_database_deletes_the_dev_scratch_file(tmp_path: Path) -> None:
    scratch = tmp_path / 'dev.db'
    scratch.write_bytes(b'stale')
    settings = Settings(run_mode='dev', db_path=scratch)

    reset_dev_database(settings)

    assert not scratch.exists()


def test_reset_dev_database_never_touches_the_user_database(tmp_path: Path) -> None:
    settings = Settings(run_mode='dev', db_path=USER_DATA_DIR / 'diction.db')

    reset_dev_database(settings)

    assert settings.resolved_db_path == settings.user_db_path


def test_reset_dev_database_is_a_noop_in_user_mode(tmp_path: Path) -> None:
    existing = tmp_path / 'user.db'
    existing.write_bytes(b'keep')
    settings = Settings(run_mode='user', db_path=existing)

    reset_dev_database(settings)

    assert existing.exists()
