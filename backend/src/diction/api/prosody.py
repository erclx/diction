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


@router.post('/prosody/score')
def score_prosody(
    scorer: Annotated[ProsodyScorer, Depends(get_prosody_scorer)],
    synth: Annotated[Synthesizer, Depends(get_synth)],
    reference_text: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
) -> ProsodyScoreResponse:
    cleaned = _clean_reference_text(reference_text)
    reference_audio = synth.synthesize(cleaned)
    result = scorer.score(reference_audio, audio.file.read())
    return ProsodyScoreResponse(
        rhythm_match=result.rhythm_match,
        intonation_match=result.intonation_match,
    )


@router.post('/prosody/analyze')
def analyze_prosody(
    scorer: Annotated[ProsodyScorer, Depends(get_prosody_scorer)],
    synth: Annotated[Synthesizer, Depends(get_synth)],
    reference_text: Annotated[str, Form()],
    audio: Annotated[UploadFile, File()],
) -> ProsodyAnalyzeResponse:
    cleaned = _clean_reference_text(reference_text)
    reference_audio = synth.synthesize(cleaned)
    analysis = scorer.analyze(cleaned, reference_audio, audio.file.read())
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
