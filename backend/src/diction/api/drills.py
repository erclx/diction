from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from diction.db.engine import get_session
from diction.db.models import DrillRep
from diction.scoring.audio import MIN_WORD_CLIP_SECONDS
from diction.scoring.base import PassageScorer
from diction.scoring.text import normalize_word
from diction.storage.drills import save_drill_rep

router = APIRouter(tags=['drills'])


class MinimalPairScoreResponse(BaseModel):
    said_expected_word: bool
    phoneme_quality: float
    flagged_phonemes: list[str]


class EarTrainingRepResponse(BaseModel):
    recorded: bool


def get_scorer(request: Request) -> PassageScorer:
    return cast(PassageScorer, request.app.state.scorer)


@router.post('/drills/minimal-pair/score')
def score_minimal_pair(
    session: Annotated[Session, Depends(get_session)],
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
    save_drill_rep(
        session,
        DrillRep(
            mode='production',
            target=target_phoneme,
            passed=not result.target_substituted,
        ),
    )
    return MinimalPairScoreResponse(
        said_expected_word=True,
        phoneme_quality=result.phoneme_quality,
        flagged_phonemes=[target_phoneme] if result.target_substituted else [],
    )


@router.post('/drills/ear-training/rep')
def record_ear_training_rep(
    session: Annotated[Session, Depends(get_session)],
    target_phoneme: Annotated[str, Form()],
    correct: Annotated[bool, Form()],
) -> EarTrainingRepResponse:
    save_drill_rep(
        session,
        DrillRep(mode='ear-training', target=target_phoneme, passed=correct),
    )
    return EarTrainingRepResponse(recorded=True)
