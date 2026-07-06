from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel

from diction.scoring.prosody_base import ProsodyScorer
from diction.tts.base import Synthesizer

router = APIRouter(tags=['prosody'])

MAX_REFERENCE_TEXT_LENGTH = 600


class ProsodyScoreResponse(BaseModel):
    rhythm_match: float
    intonation_match: float


def get_prosody_scorer(request: Request) -> ProsodyScorer:
    return cast(ProsodyScorer, request.app.state.prosody_scorer)


def get_synth(request: Request) -> Synthesizer:
    return cast(Synthesizer, request.app.state.synth)


@router.post('/prosody/score')
def score_prosody(
    scorer: Annotated[ProsodyScorer, Depends(get_prosody_scorer)],
    synth: Annotated[Synthesizer, Depends(get_synth)],
    reference_text: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
) -> ProsodyScoreResponse:
    cleaned = reference_text.strip()
    if not cleaned:
        raise HTTPException(
            status_code=422, detail='Enter reference text to score against'
        )
    if len(cleaned) > MAX_REFERENCE_TEXT_LENGTH:
        raise HTTPException(status_code=422, detail='Reference text is too long')

    reference_audio = synth.synthesize(cleaned)
    result = scorer.score(reference_audio, audio.file.read())
    return ProsodyScoreResponse(
        rhythm_match=result.rhythm_match,
        intonation_match=result.intonation_match,
    )
