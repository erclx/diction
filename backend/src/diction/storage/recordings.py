from pathlib import Path

RECORDING_SUFFIX = '.webm'


def store_recording(recordings_dir: Path, session_id: int, data: bytes) -> str:
    recordings_dir.mkdir(parents=True, exist_ok=True)
    filename = f'{session_id}{RECORDING_SUFFIX}'
    (recordings_dir / filename).write_bytes(data)
    return filename


def recording_file(recordings_dir: Path, filename: str) -> Path | None:
    path = recordings_dir / filename
    return path if path.is_file() else None
