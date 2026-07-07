from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlmodel import Session

from diction.db.engine import get_session
from diction.storage.resurfacing import aggregate_resurfacing

router = APIRouter(tags=['resurfacing'])


class DueSound(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    phoneme: str
    box: int
    interval_days: int
    last_practiced: datetime
    next_due: datetime
    is_due: bool
    example_words: list[str]


@router.get('/resurfacing')
def read_resurfacing(
    session: Annotated[Session, Depends(get_session)],
) -> list[DueSound]:
    return [DueSound.model_validate(row) for row in aggregate_resurfacing(session)]
