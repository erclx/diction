from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlmodel import Session

from diction.api.schemas import FlaggedWordResponse
from diction.config import Settings, get_settings
from diction.db.engine import get_session
from diction.storage.recordings import recording_file
from diction.storage.sessions import get_session_by_id, list_sessions

router = APIRouter(tags=['sessions'])


class SessionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    mode: str
    accuracy: float
    phoneme_quality: float


class SessionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    mode: str
    completeness: float
    accuracy: float
    fluency: float
    phoneme_quality: float
    has_recording: bool = False
    flagged_words: list[FlaggedWordResponse]


@router.get('/sessions')
def read_sessions(
    session: Annotated[Session, Depends(get_session)],
) -> list[SessionListItem]:
    return [SessionListItem.model_validate(record) for record in list_sessions(session)]


@router.get('/sessions/{session_id}')
def read_session(
    session: Annotated[Session, Depends(get_session)],
    session_id: int,
) -> SessionDetailResponse:
    record = get_session_by_id(session, session_id)
    if record is None:
        raise HTTPException(status_code=404, detail='Session not found')
    detail = SessionDetailResponse.model_validate(record)
    detail.has_recording = record.recording_path is not None
    return detail


@router.get('/sessions/{session_id}/recording')
def read_session_recording(
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    session_id: int,
) -> FileResponse:
    record = get_session_by_id(session, session_id)
    if record is None or record.recording_path is None:
        raise HTTPException(status_code=404, detail='Recording not found')
    path = recording_file(settings.resolved_recordings_dir, record.recording_path)
    if path is None:
        raise HTTPException(status_code=404, detail='Recording not found')
    return FileResponse(path, media_type='audio/webm')
