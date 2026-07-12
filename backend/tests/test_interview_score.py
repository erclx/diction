from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

from diction.api.free_topic import get_transcriber
from diction.api.interview import get_interview_scorer
from diction.api.passages import get_scorer
from diction.app import create_app
from diction.config import Settings, get_settings
from diction.db.engine import get_session, make_engine
from diction.interview.types import (
    EyeContactSummary,
    InterviewReport,
    PostureSummary,
)
from diction.scoring.audio import MIN_CLIP_SECONDS, ClipTooWeakError
from diction.scoring.transcription_base import Transcript
from diction.scoring.types import FlaggedWordResult, ScoreResult
from diction.storage import interview as interview_storage
from diction.storage import sessions as sessions_storage


class FakeScorer:
    def __init__(self, result: ScoreResult) -> None:
        self._result = result
        self.received_passage: str | None = None

    def score(
        self, passage: str, audio: bytes, min_clip_seconds: float = MIN_CLIP_SECONDS
    ) -> ScoreResult:
        self.received_passage = passage
        return self._result


class RaisingScorer:
    def score(
        self, passage: str, audio: bytes, min_clip_seconds: float = MIN_CLIP_SECONDS
    ) -> ScoreResult:
        raise ClipTooWeakError('duration=0.10s below 1.0s minimum')


class FakeTranscriber:
    def __init__(self, text: str) -> None:
        self._text = text

    def transcribe(self, audio: bytes, prompt: str | None = None) -> Transcript:
        return Transcript(text=self._text, words=[])

    def word_timings(
        self, audio: bytes, prompt: str | None = None
    ) -> list[tuple[str, float, float]]:
        return []


class FakeInterviewScorer:
    def __init__(self, report: InterviewReport) -> None:
        self._report = report
        self.received_path: Path | None = None

    def score(self, video_path: Path) -> InterviewReport:
        self.received_path = video_path
        return self._report


class RaisingInterviewScorer:
    def score(self, video_path: Path) -> InterviewReport:
        raise RuntimeError('mediapipe blew up')


@pytest.fixture
def engine(tmp_path) -> Engine:
    built = make_engine(f'sqlite:///{tmp_path / "test.db"}')
    SQLModel.metadata.create_all(built)
    return built


@pytest.fixture
def recordings_dir(tmp_path) -> Path:
    return tmp_path / 'recordings'


@pytest.fixture
def client(engine: Engine, recordings_dir: Path) -> Iterator[TestClient]:
    app = create_app()

    def override_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_settings] = lambda: Settings(
        recordings_dir=recordings_dir
    )
    app.dependency_overrides[get_transcriber] = lambda: FakeTranscriber(
        'I led the migration end to end'
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


def _fixed_result() -> ScoreResult:
    return ScoreResult(
        completeness=90.0,
        accuracy=80.0,
        fluency=70.0,
        phoneme_quality=60.0,
        flagged_words=[
            FlaggedWordResult(word='migration', start=1.0, end=1.4, phoneme='ɡ')
        ],
    )


def _fixed_report() -> InterviewReport:
    return InterviewReport(
        posture=PostureSummary(
            stability=0.88, gesture_ratio=0.25, shoulder_tilt_deg=6.0
        ),
        eye_contact=EyeContactSummary(looking_pct=82.0),
    )


def _post(
    client: TestClient,
    answer: str = 'I led the migration end to end',
    question: str | None = None,
) -> object:
    data = {'scripted_answer': answer}
    if question is not None:
        data['question'] = question
    return client.post(
        '/api/interview/score',
        data=data,
        files={'video': ('clip.webm', b'fake-bytes', 'video/webm')},
    )


def test_score_returns_pronunciation_cv_and_transcript_and_persists(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_fixed_result())
    client.app.dependency_overrides[get_interview_scorer] = lambda: FakeInterviewScorer(
        _fixed_report()
    )

    response = _post(client)

    assert response.status_code == 200
    body = response.json()
    assert body['transcript'] == 'I led the migration end to end'
    assert body['phoneme_quality'] == 60.0
    assert body['flagged_words'][0]['phoneme'] == 'ɡ'
    assert body['cv']['eye_contact']['looking_pct'] == 82.0
    assert body['cv']['posture']['shoulder_tilt_deg'] == 6.0
    with Session(engine) as session:
        saved = sessions_storage.list_sessions(session)
        assert len(saved) == 1
        assert saved[0].mode == 'interview'
        assert saved[0].passage == 'I led the migration end to end'
        assert saved[0].transcript == 'I led the migration end to end'
        assert saved[0].flagged_words[0].word == 'migration'
        assert saved[0].id is not None
        metrics = interview_storage.get_interview_metrics_by_session(
            session, saved[0].id
        )
        assert metrics is not None
        assert metrics.eye_contact_pct == 82.0
        assert metrics.shoulder_tilt_deg == 6.0


def test_score_persists_the_question_prompt_when_posted(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_fixed_result())
    client.app.dependency_overrides[get_interview_scorer] = lambda: FakeInterviewScorer(
        _fixed_report()
    )

    response = _post(client, question='Tell me about a project you led.')

    assert response.status_code == 200
    with Session(engine) as session:
        saved = sessions_storage.list_sessions(session)
        assert saved[0].prompt == 'Tell me about a project you led.'


def test_score_persists_a_null_prompt_when_the_question_is_omitted(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_fixed_result())
    client.app.dependency_overrides[get_interview_scorer] = lambda: FakeInterviewScorer(
        _fixed_report()
    )

    response = _post(client)

    assert response.status_code == 200
    with Session(engine) as session:
        saved = sessions_storage.list_sessions(session)
        assert saved[0].prompt is None


def test_score_pronunciation_uses_the_scripted_answer_as_reference(
    client: TestClient,
) -> None:
    scorer = FakeScorer(_fixed_result())
    client.app.dependency_overrides[get_scorer] = lambda: scorer
    client.app.dependency_overrides[get_interview_scorer] = lambda: FakeInterviewScorer(
        _fixed_report()
    )

    _post(client, answer='My scripted answer text')

    assert scorer.received_passage == 'My scripted answer text'


def test_score_degrades_to_absent_cv_when_the_cv_scorer_fails(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_fixed_result())
    client.app.dependency_overrides[get_interview_scorer] = lambda: (
        RaisingInterviewScorer()
    )

    response = _post(client)

    assert response.status_code == 200
    body = response.json()
    assert body['cv'] is None
    assert body['phoneme_quality'] == 60.0
    with Session(engine) as session:
        saved = sessions_storage.list_sessions(session)
        assert len(saved) == 1
        assert saved[0].id is not None
        assert (
            interview_storage.get_interview_metrics_by_session(session, saved[0].id)
            is None
        )


def test_score_returns_422_for_a_too_weak_clip(client: TestClient) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: RaisingScorer()
    client.app.dependency_overrides[get_interview_scorer] = lambda: FakeInterviewScorer(
        _fixed_report()
    )

    response = _post(client)

    assert response.status_code == 422
    assert response.json()['error'] == 'clip_too_weak'
