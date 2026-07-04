from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlmodel import Session

from diction.db.engine import get_session
from diction.storage.weak_sounds import aggregate_weak_sounds

router = APIRouter(tags=['weak-sounds'])


class WeakSound(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    phoneme: str
    occurrence_count: int
    word_count: int
    example_words: list[str]
    first_seen: datetime
    last_seen: datetime


@router.get('/weak-sounds')
def read_weak_sounds(
    session: Annotated[Session, Depends(get_session)],
) -> list[WeakSound]:
    return [WeakSound.model_validate(row) for row in aggregate_weak_sounds(session)]
