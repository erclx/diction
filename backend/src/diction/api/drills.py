from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel

from diction.scoring.audio import MIN_WORD_CLIP_SECONDS
from diction.scoring.base import PassageScorer
from diction.scoring.text import normalize_word

router = APIRouter(tags=['drills'])


class MinimalPairScoreResponse(BaseModel):
    said_expected_word: bool
    phoneme_quality: float
    flagged_phonemes: list[str]


def get_scorer(request: Request) -> PassageScorer:
    return cast(PassageScorer, request.app.state.scorer)


@router.post('/drills/minimal-pair/score')
def score_minimal_pair(
    scorer: Annotated[PassageScorer, Depends(get_scorer)],
    word: Annotated[str, Form()],
    competitor_word: Annotated[str, Form()],
    target_phoneme: Annotated[str, Form()],
    competitor_phoneme: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
) -> MinimalPairScoreResponse:
    clip = audio.file.read()

    heard = scorer.recognize_word(clip, [word, competitor_word])
    expected = {normalize_word(word), normalize_word(competitor_word)}
    if heard and heard not in expected:
        return MinimalPairScoreResponse(
            said_expected_word=False, phoneme_quality=0.0, flagged_phonemes=[]
        )

    result = scorer.score_target_contrast(
        word,
        clip,
        target_phoneme=target_phoneme,
        competitor_phoneme=competitor_phoneme,
        min_clip_seconds=MIN_WORD_CLIP_SECONDS,
    )
    return MinimalPairScoreResponse(
        said_expected_word=True,
        phoneme_quality=result.phoneme_quality,
        flagged_phonemes=[target_phoneme] if result.target_substituted else [],
    )
