from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from diction.api.voices import validate_voice
from diction.db.engine import get_session
from diction.db.models import DrillRep
from diction.scoring.prosody_base import ProsodyScorer
from diction.storage.drills import save_drill_rep
from diction.tts.base import Synthesizer

router = APIRouter(tags=['prosody'])

MAX_REFERENCE_TEXT_LENGTH = 600


class ProsodyScoreResponse(BaseModel):
    rhythm_match: float
    intonation_match: float


class StressMarkResponse(BaseModel):
    word: str
    syllables: list[str]
    stress_index: int


class ProsodyAnalyzeResponse(BaseModel):
    rhythm_match: float
    intonation_match: float
    reference_contour: list[float]
    learner_contour: list[float]
    reference_timings: list[tuple[float, float]]
    stress_marks: list[StressMarkResponse]


def get_prosody_scorer(request: Request) -> ProsodyScorer:
    return cast(ProsodyScorer, request.app.state.prosody_scorer)


def get_synth(request: Request) -> Synthesizer:
    return cast(Synthesizer, request.app.state.synth)


def _clean_reference_text(reference_text: str) -> str:
    cleaned = reference_text.strip()
    if not cleaned:
        raise HTTPException(
            status_code=422, detail='Enter reference text to score against'
        )
    if len(cleaned) > MAX_REFERENCE_TEXT_LENGTH:
        raise HTTPException(status_code=422, detail='Reference text is too long')
    return cleaned


def _prosody_match(rhythm_match: float, intonation_match: float) -> float:
    return (rhythm_match + intonation_match) / 2


@router.post('/prosody/score')
def score_prosody(
    session: Annotated[Session, Depends(get_session)],
    scorer: Annotated[ProsodyScorer, Depends(get_prosody_scorer)],
    synth: Annotated[Synthesizer, Depends(get_synth)],
    reference_text: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
    voice: Annotated[str | None, Form()] = None,
) -> ProsodyScoreResponse:
    cleaned = _clean_reference_text(reference_text)
    validate_voice(voice)
    reference_audio = synth.synthesize(cleaned, voice)
    result = scorer.score(reference_audio, audio.file.read())
    save_drill_rep(
        session,
        DrillRep(
            mode='shadowing',
            target=cleaned,
            score=_prosody_match(result.rhythm_match, result.intonation_match),
        ),
    )
    return ProsodyScoreResponse(
        rhythm_match=result.rhythm_match,
        intonation_match=result.intonation_match,
    )


@router.post('/prosody/analyze')
def analyze_prosody(
    session: Annotated[Session, Depends(get_session)],
    scorer: Annotated[ProsodyScorer, Depends(get_prosody_scorer)],
    synth: Annotated[Synthesizer, Depends(get_synth)],
    reference_text: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
    voice: Annotated[str | None, Form()] = None,
) -> ProsodyAnalyzeResponse:
    cleaned = _clean_reference_text(reference_text)
    validate_voice(voice)
    reference_audio = synth.synthesize(cleaned, voice)
    analysis = scorer.analyze(cleaned, reference_audio, audio.file.read())
    save_drill_rep(
        session,
        DrillRep(
            mode='stress',
            target=cleaned,
            score=_prosody_match(analysis.rhythm_match, analysis.intonation_match),
        ),
    )
    return ProsodyAnalyzeResponse(
        rhythm_match=analysis.rhythm_match,
        intonation_match=analysis.intonation_match,
        reference_contour=analysis.reference_contour,
        learner_contour=analysis.learner_contour,
        reference_timings=analysis.reference_timings,
        stress_marks=[
            StressMarkResponse(
                word=mark.word,
                syllables=mark.syllables,
                stress_index=mark.stress_index,
            )
            for mark in analysis.stress_marks
        ],
    )
