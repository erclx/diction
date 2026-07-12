from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

from diction.app import create_app
from diction.config import Settings, get_settings
from diction.db.engine import get_session, make_engine
from diction.db.models import FlaggedWord, InterviewMetrics, PracticeSession
from diction.storage.interview import save_interview_metrics
from diction.storage.sessions import save_session


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
    yield TestClient(app)
    app.dependency_overrides.clear()


def _seed(engine: Engine, record: PracticeSession) -> int:
    with Session(engine) as session:
        saved = save_session(session, record)
        return saved.id


def _passage_session(accuracy: float) -> PracticeSession:
    return PracticeSession(
        mode='passage',
        passage='The early bird catches the worm.',
        completeness=90.0,
        accuracy=accuracy,
        fluency=70.0,
        phoneme_quality=60.0,
    )


def test_list_returns_sessions_newest_first(client: TestClient, engine: Engine) -> None:
    older = _seed(engine, _passage_session(accuracy=80.0))
    newer = _seed(engine, _passage_session(accuracy=85.0))

    response = client.get('/api/sessions')

    assert response.status_code == 200
    body = response.json()
    assert [row['id'] for row in body] == [newer, older]
    assert body[0]['accuracy'] == 85.0
    assert 'flagged_words' not in body[0]


def test_detail_returns_a_session_with_flagged_words(
    client: TestClient, engine: Engine
) -> None:
    record = _passage_session(accuracy=92.0)
    record.flagged_words = [
        FlaggedWord(
            word='thought',
            phoneme='θ',
            start=6.19,
            end=6.59,
            explanation='The /θ/ sound scored low.',
        )
    ]
    session_id = _seed(engine, record)

    response = client.get(f'/api/sessions/{session_id}')

    assert response.status_code == 200
    body = response.json()
    assert body['id'] == session_id
    assert body['fluency'] == 70.0
    assert body['passage'] == 'The early bird catches the worm.'
    assert body['has_recording'] is False
    assert body['flagged_words'][0]['word'] == 'thought'
    assert body['flagged_words'][0]['phoneme'] == 'θ'


def test_detail_returns_transcript_and_critique_for_a_free_topic_session(
    client: TestClient, engine: Engine
) -> None:
    record = PracticeSession(
        mode='free-topic',
        transcript='we drives to the park',
        critique='Use past tense: say "we drove".',
        completeness=100.0,
        accuracy=91.0,
        fluency=84.0,
        phoneme_quality=88.0,
    )
    session_id = _seed(engine, record)

    response = client.get(f'/api/sessions/{session_id}')

    assert response.status_code == 200
    body = response.json()
    assert body['transcript'] == 'we drives to the park'
    assert body['critique'] == 'Use past tense: say "we drove".'
    assert body['passage'] is None


def _interview_session() -> PracticeSession:
    return PracticeSession(
        mode='interview',
        passage='I led the migration and cut latency in half.',
        prompt='Tell me about a time you solved a hard problem.',
        transcript='i led the migration and cut latency in half',
        completeness=100.0,
        accuracy=90.0,
        fluency=85.0,
        phoneme_quality=88.0,
    )


def test_detail_returns_prompt_and_cv_for_an_interview_session(
    client: TestClient, engine: Engine
) -> None:
    session_id = _seed(engine, _interview_session())
    with Session(engine) as session:
        save_interview_metrics(
            session,
            InterviewMetrics(
                session_id=session_id,
                eye_contact_pct=94.0,
                stability=0.82,
                gesture_ratio=0.12,
                shoulder_tilt_deg=6.0,
            ),
        )

    response = client.get(f'/api/sessions/{session_id}')

    assert response.status_code == 200
    body = response.json()
    assert body['prompt'] == 'Tell me about a time you solved a hard problem.'
    assert body['cv']['eye_contact']['looking_pct'] == 94.0
    assert body['cv']['posture']['stability'] == 0.82
    assert body['cv']['posture']['gesture_ratio'] == 0.12
    assert body['cv']['posture']['shoulder_tilt_deg'] == 6.0


def test_detail_returns_null_prompt_and_cv_for_a_passage_session(
    client: TestClient, engine: Engine
) -> None:
    session_id = _seed(engine, _passage_session(accuracy=92.0))

    response = client.get(f'/api/sessions/{session_id}')

    assert response.status_code == 200
    body = response.json()
    assert body['prompt'] is None
    assert body['cv'] is None


def test_detail_reports_has_recording_when_a_clip_is_stored(
    client: TestClient, engine: Engine, recordings_dir: Path
) -> None:
    session_id = _seed_with_recording(engine, recordings_dir)

    response = client.get(f'/api/sessions/{session_id}')

    assert response.status_code == 200
    assert response.json()['has_recording'] is True


def test_detail_returns_404_for_an_unknown_id(client: TestClient) -> None:
    response = client.get('/api/sessions/999')

    assert response.status_code == 404


def _seed_with_recording(engine: Engine, recordings_dir: Path) -> int:
    record = _passage_session(accuracy=88.0)
    session_id = _seed(engine, record)
    recordings_dir.mkdir(parents=True, exist_ok=True)
    (recordings_dir / f'{session_id}.webm').write_bytes(b'clip-bytes')
    with Session(engine) as session:
        stored = session.get(PracticeSession, session_id)
        assert stored is not None
        stored.recording_path = f'{session_id}.webm'
        session.add(stored)
        session.commit()
    return session_id


def test_recording_serves_the_stored_clip(
    client: TestClient, engine: Engine, recordings_dir: Path
) -> None:
    session_id = _seed_with_recording(engine, recordings_dir)

    response = client.get(f'/api/sessions/{session_id}/recording')

    assert response.status_code == 200
    assert response.content == b'clip-bytes'
    assert response.headers['content-type'] == 'audio/webm'


def test_recording_serves_an_interview_clip_as_video(
    client: TestClient, engine: Engine, recordings_dir: Path
) -> None:
    session_id = _seed(engine, _interview_session())
    recordings_dir.mkdir(parents=True, exist_ok=True)
    (recordings_dir / f'{session_id}.webm').write_bytes(b'clip-bytes')
    with Session(engine) as session:
        stored = session.get(PracticeSession, session_id)
        assert stored is not None
        stored.recording_path = f'{session_id}.webm'
        session.add(stored)
        session.commit()

    response = client.get(f'/api/sessions/{session_id}/recording')

    assert response.status_code == 200
    assert response.headers['content-type'] == 'video/webm'


def test_recording_returns_404_when_the_session_has_no_recording(
    client: TestClient, engine: Engine
) -> None:
    session_id = _seed(engine, _passage_session(accuracy=88.0))

    response = client.get(f'/api/sessions/{session_id}/recording')

    assert response.status_code == 404


def test_recording_returns_404_when_the_file_is_missing(
    client: TestClient, engine: Engine, recordings_dir: Path
) -> None:
    session_id = _seed_with_recording(engine, recordings_dir)
    (recordings_dir / f'{session_id}.webm').unlink()

    response = client.get(f'/api/sessions/{session_id}/recording')

    assert response.status_code == 404
