import logging
from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from diction.api.passages import get_scorer
from diction.api.schemas import FlaggedWordResponse
from diction.config import Settings, get_settings
from diction.db.engine import get_session
from diction.db.models import FlaggedWord, PracticeSession
from diction.feedback.base import Critic, default_critique, default_explanation
from diction.feedback.types import Critique
from diction.scoring.base import PassageScorer
from diction.scoring.transcription_base import Transcriber
from diction.scoring.types import ScoreResult
from diction.storage.recordings import store_recording
from diction.storage.sessions import save_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=['free-topic'])


class FreeTopicScoreResponse(BaseModel):
    completeness: float
    accuracy: float
    fluency: float
    phoneme_quality: float
    flagged_words: list[FlaggedWordResponse]
    transcript: str
    critique: list[str]


def get_transcriber(request: Request) -> Transcriber:
    return cast(Transcriber, request.app.state.transcriber)


def get_critic(request: Request) -> Critic:
    return cast(Critic, request.app.state.critic)


@router.post('/free-topic/score')
def score_free_topic(
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    scorer: Annotated[PassageScorer, Depends(get_scorer)],
    transcriber: Annotated[Transcriber, Depends(get_transcriber)],
    critic: Annotated[Critic, Depends(get_critic)],
    audio: Annotated[UploadFile, File()],
    topic: Annotated[str | None, Form()] = None,
) -> FreeTopicScoreResponse:
    clip = audio.file.read()
    transcript = transcriber.transcribe(clip)
    result = scorer.score(transcript.text, clip)
    critique = _critique_or_default(critic, transcript.text, topic)
    record = PracticeSession(
        mode='free-topic',
        transcript=transcript.text,
        critique='\n'.join(critique.points),
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
                explanation=default_explanation(flag.word, flag.phoneme),
            )
            for flag in result.flagged_words
        ],
    )
    save_session(session, record)
    _attach_recording(session, settings, record, clip)
    return _to_response(result, transcript.text, critique)


def _critique_or_default(
    critic: Critic, transcript: str, topic: str | None
) -> Critique:
    try:
        return critic.critique(transcript, topic)
    except Exception:
        logger.warning(
            'critic failed; persisting the default critique instead',
            exc_info=True,
        )
        return default_critique()


def _attach_recording(
    session: Session, settings: Settings, record: PracticeSession, clip: bytes
) -> None:
    assert record.id is not None
    try:
        record.recording_path = store_recording(
            settings.resolved_recordings_dir, record.id, clip
        )
        session.add(record)
        session.commit()
    except OSError:
        logger.warning(
            'failed to store recording; session persisted without a clip',
            exc_info=True,
        )
        session.rollback()


def _to_response(
    result: ScoreResult, transcript: str, critique: Critique
) -> FreeTopicScoreResponse:
    return FreeTopicScoreResponse(
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
                explanation=default_explanation(flag.word, flag.phoneme),
            )
            for flag in result.flagged_words
        ],
        transcript=transcript,
        critique=list(critique.points),
    )
