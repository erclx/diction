import logging
from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from diction.api.schemas import FlaggedWordResponse
from diction.db.engine import get_session
from diction.db.models import FlaggedWord, PracticeSession
from diction.feedback.base import Explainer, default_explanation
from diction.feedback.types import FlaggedWordContext
from diction.scoring.base import PassageScorer
from diction.scoring.types import FlaggedWordResult, ScoreResult
from diction.storage.sessions import save_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=['passages'])


class PassageScoreResponse(BaseModel):
    completeness: float
    accuracy: float
    fluency: float
    phoneme_quality: float
    flagged_words: list[FlaggedWordResponse]


def get_scorer(request: Request) -> PassageScorer:
    return cast(PassageScorer, request.app.state.scorer)


def get_explainer(request: Request) -> Explainer:
    return cast(Explainer, request.app.state.explainer)


@router.post('/passages/score')
def score_passage(
    session: Annotated[Session, Depends(get_session)],
    scorer: Annotated[PassageScorer, Depends(get_scorer)],
    explainer: Annotated[Explainer, Depends(get_explainer)],
    passage: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
) -> PassageScoreResponse:
    result = scorer.score(passage, audio.file.read())
    explanations = _explain_or_default(explainer, result.flagged_words)
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
                explanation=explanation,
            )
            for flag, explanation in zip(
                result.flagged_words, explanations, strict=True
            )
        ],
    )
    save_session(session, record)
    return _to_response(result, explanations)


def _explain_or_default(
    explainer: Explainer, flagged_words: list[FlaggedWordResult]
) -> list[str]:
    try:
        return explainer.explain(
            [
                FlaggedWordContext(word=flag.word, phoneme=flag.phoneme)
                for flag in flagged_words
            ]
        )
    except Exception:
        logger.warning(
            'explainer failed; persisting template explanations instead',
            exc_info=True,
        )
        return [default_explanation(flag.word, flag.phoneme) for flag in flagged_words]


def _to_response(result: ScoreResult, explanations: list[str]) -> PassageScoreResponse:
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
                explanation=explanation,
            )
            for flag, explanation in zip(
                result.flagged_words, explanations, strict=True
            )
        ],
    )
