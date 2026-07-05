from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel

from diction.api.schemas import FlaggedWordResponse
from diction.feedback.base import default_explanation
from diction.scoring.audio import MIN_WORD_CLIP_SECONDS
from diction.scoring.base import PassageScorer

router = APIRouter(tags=['drills'])


class MinimalPairScoreResponse(BaseModel):
    flagged_words: list[FlaggedWordResponse]


def get_scorer(request: Request) -> PassageScorer:
    return cast(PassageScorer, request.app.state.scorer)


@router.post('/drills/minimal-pair/score')
def score_minimal_pair(
    scorer: Annotated[PassageScorer, Depends(get_scorer)],
    word: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
) -> MinimalPairScoreResponse:
    result = scorer.score(
        word, audio.file.read(), min_clip_seconds=MIN_WORD_CLIP_SECONDS
    )
    return MinimalPairScoreResponse(
        flagged_words=[
            FlaggedWordResponse(
                word=flag.word,
                start=flag.start,
                end=flag.end,
                phoneme=flag.phoneme,
                explanation=default_explanation(flag.word, flag.phoneme),
            )
            for flag in result.flagged_words
        ]
    )
