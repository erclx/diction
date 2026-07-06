from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel

from diction.scoring.audio import MIN_WORD_CLIP_SECONDS
from diction.scoring.base import PassageScorer

router = APIRouter(tags=['drills'])


class MinimalPairScoreResponse(BaseModel):
    phoneme_quality: float
    flagged_phonemes: list[str]


def get_scorer(request: Request) -> PassageScorer:
    return cast(PassageScorer, request.app.state.scorer)


@router.post('/drills/minimal-pair/score')
def score_minimal_pair(
    scorer: Annotated[PassageScorer, Depends(get_scorer)],
    word: Annotated[str, Form()],
    target_phoneme: Annotated[str, Form()],
    competitor_phoneme: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
) -> MinimalPairScoreResponse:
    result = scorer.score_target_contrast(
        word,
        audio.file.read(),
        target_phoneme=target_phoneme,
        competitor_phoneme=competitor_phoneme,
        min_clip_seconds=MIN_WORD_CLIP_SECONDS,
    )
    return MinimalPairScoreResponse(
        phoneme_quality=result.phoneme_quality,
        flagged_phonemes=[target_phoneme] if result.target_substituted else [],
    )
