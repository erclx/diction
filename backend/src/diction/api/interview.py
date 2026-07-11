import logging
import tempfile
from pathlib import Path
from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from diction.api.free_topic import get_transcriber
from diction.api.passages import get_scorer
from diction.api.schemas import FlaggedWordResponse
from diction.config import Settings, get_settings
from diction.db.engine import get_session
from diction.db.models import FlaggedWord, InterviewMetrics, PracticeSession
from diction.feedback.base import default_explanation
from diction.interview.base import InterviewScorer
from diction.interview.questions import RehearsalQuestion, load_questions
from diction.interview.types import InterviewReport
from diction.scoring.base import PassageScorer
from diction.scoring.transcription_base import Transcriber
from diction.scoring.types import ScoreResult
from diction.storage.interview import save_interview_metrics
from diction.storage.recordings import store_recording
from diction.storage.sessions import save_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=['interview'])

VIDEO_SUFFIX = '.webm'


class InterviewQuestion(BaseModel):
    category: str
    question: str
    keyword_beats: list[str]
    scripted_answer: str


class PostureResponse(BaseModel):
    stability: float
    gesture_ratio: float
    shoulder_tilt_deg: float


class EyeContactResponse(BaseModel):
    looking_pct: float


class CvReportResponse(BaseModel):
    posture: PostureResponse
    eye_contact: EyeContactResponse


class InterviewScoreResponse(BaseModel):
    completeness: float
    accuracy: float
    fluency: float
    phoneme_quality: float
    flagged_words: list[FlaggedWordResponse]
    transcript: str
    cv: CvReportResponse | None


def _to_response(question: RehearsalQuestion) -> InterviewQuestion:
    beats = question.keywords.split('\n') if question.keywords else []
    return InterviewQuestion(
        category=question.category,
        question=question.question,
        keyword_beats=beats,
        scripted_answer=question.answer,
    )


@router.get('/interview/questions')
def read_interview_questions(
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[InterviewQuestion]:
    questions = load_questions(settings.interview_source_dir)
    return [_to_response(question) for question in questions]


def get_interview_scorer(request: Request) -> InterviewScorer:
    return cast(InterviewScorer, request.app.state.interview_scorer)


@router.post('/interview/score')
def score_interview(
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    scorer: Annotated[PassageScorer, Depends(get_scorer)],
    transcriber: Annotated[Transcriber, Depends(get_transcriber)],
    interview_scorer: Annotated[InterviewScorer, Depends(get_interview_scorer)],
    video: Annotated[UploadFile, File()],
    scripted_answer: Annotated[str, Form()],
) -> InterviewScoreResponse:
    clip = video.file.read()
    cv_report = _score_cv_or_none(interview_scorer, clip)
    transcript = transcriber.transcribe(clip)
    result = scorer.score(scripted_answer, clip)
    record = PracticeSession(
        mode='interview',
        passage=scripted_answer,
        transcript=transcript.text,
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
    if cv_report is not None:
        _save_metrics(session, record, cv_report)
    return _to_response_score(result, transcript.text, cv_report)


def _score_cv_or_none(scorer: InterviewScorer, clip: bytes) -> InterviewReport | None:
    try:
        with tempfile.NamedTemporaryFile(suffix=VIDEO_SUFFIX) as temp:
            temp.write(clip)
            temp.flush()
            return scorer.score(Path(temp.name))
    except Exception:
        logger.warning(
            'interview CV scoring failed; returning the pronunciation score '
            'with an absent CV report',
            exc_info=True,
        )
        return None


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


def _save_metrics(
    session: Session, record: PracticeSession, report: InterviewReport
) -> None:
    assert record.id is not None
    try:
        save_interview_metrics(
            session,
            InterviewMetrics(
                session_id=record.id,
                eye_contact_pct=report.eye_contact.looking_pct,
                stability=report.posture.stability,
                gesture_ratio=report.posture.gesture_ratio,
                shoulder_tilt_deg=report.posture.shoulder_tilt_deg,
            ),
        )
    except Exception:
        logger.warning(
            'failed to save interview metrics; session persisted without them',
            exc_info=True,
        )
        session.rollback()


def _to_cv_response(report: InterviewReport | None) -> CvReportResponse | None:
    if report is None:
        return None
    return CvReportResponse(
        posture=PostureResponse(
            stability=report.posture.stability,
            gesture_ratio=report.posture.gesture_ratio,
            shoulder_tilt_deg=report.posture.shoulder_tilt_deg,
        ),
        eye_contact=EyeContactResponse(looking_pct=report.eye_contact.looking_pct),
    )


def _to_response_score(
    result: ScoreResult, transcript: str, report: InterviewReport | None
) -> InterviewScoreResponse:
    return InterviewScoreResponse(
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
        cv=_to_cv_response(report),
    )
