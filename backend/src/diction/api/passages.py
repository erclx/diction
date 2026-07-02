from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from diction.db.engine import get_session
from diction.db.models import FlaggedWord, PracticeSession
from diction.scoring.base import PassageScorer
from diction.scoring.types import ScoreResult
from diction.storage.sessions import save_session

router = APIRouter(tags=['passages'])


class FlaggedWordResponse(BaseModel):
    word: str
    start: float
    end: float
    phoneme: str
    explanation: str


class PassageScoreResponse(BaseModel):
    completeness: float
    accuracy: float
    fluency: float
    phoneme_quality: float
    flagged_words: list[FlaggedWordResponse]


def get_scorer(request: Request) -> PassageScorer:
    return cast(PassageScorer, request.app.state.scorer)


def _explain(word: str, phoneme: str) -> str:
    return (
        f"The /{phoneme}/ sound in '{word}' scored low. "
        f'Listen to the native reference and compare.'
    )


@router.post('/passages/score')
def score_passage(
    session: Annotated[Session, Depends(get_session)],
    scorer: Annotated[PassageScorer, Depends(get_scorer)],
    passage: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
) -> PassageScoreResponse:
    result = scorer.score(passage, audio.file.read())
    record = PracticeSession(
        mode='passage',
        completeness=result.completeness,
        accuracy=result.accuracy,
        fluency=result.fluency,
        phoneme_quality=result.phoneme_quality,
        flagged_words=[
            FlaggedWord(
                word=flag.word,
                phoneme=flag.phoneme,
                start=flag.start,
                end=flag.end,
                explanation=_explain(flag.word, flag.phoneme),
            )
            for flag in result.flagged_words
        ],
    )
    save_session(session, record)
    return _to_response(result)


def _to_response(result: ScoreResult) -> PassageScoreResponse:
    return PassageScoreResponse(
        completeness=result.completeness,
        accuracy=result.accuracy,
        fluency=result.fluency,
        phoneme_quality=result.phoneme_quality,
        flagged_words=[
            FlaggedWordResponse(
                word=flag.word,
                start=flag.start,
                end=flag.end,
                phoneme=flag.phoneme,
                explanation=_explain(flag.word, flag.phoneme),
            )
            for flag in result.flagged_words
        ],
    )
