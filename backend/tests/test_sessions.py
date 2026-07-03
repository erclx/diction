from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

from diction.app import create_app
from diction.db.engine import get_session, make_engine
from diction.db.models import FlaggedWord, PracticeSession
from diction.storage.sessions import save_session


@pytest.fixture
def engine(tmp_path) -> Engine:
    built = make_engine(f'sqlite:///{tmp_path / "test.db"}')
    SQLModel.metadata.create_all(built)
    return built


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    app = create_app()

    def override_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def _seed(engine: Engine, record: PracticeSession) -> int:
    with Session(engine) as session:
        saved = save_session(session, record)
        return saved.id


def _passage_session(accuracy: float) -> PracticeSession:
    return PracticeSession(
        mode='passage',
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
    assert body['flagged_words'][0]['word'] == 'thought'
    assert body['flagged_words'][0]['phoneme'] == 'θ'


def test_detail_returns_404_for_an_unknown_id(client: TestClient) -> None:
    response = client.get('/api/sessions/999')

    assert response.status_code == 404
