from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

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


def test_resurfacing_returns_due_metadata_for_a_missed_sound(
    client: TestClient, engine: Engine
) -> None:
    record = PracticeSession(
        created_at=datetime.now(UTC) - timedelta(days=2),
        mode='passage',
        completeness=90.0,
        accuracy=80.0,
        fluency=70.0,
        phoneme_quality=60.0,
    )
    record.flagged_words = [
        FlaggedWord(word='thin', phoneme='θ', start=0.0, end=0.1, explanation='')
    ]
    with Session(engine) as session:
        save_session(session, record)

    response = client.get('/api/resurfacing')

    assert response.status_code == 200
    body = response.json()
    assert body[0]['phoneme'] == 'θ'
    assert body[0]['box'] == 0
    assert body[0]['is_due'] is True
    assert body[0]['example_words'] == ['thin']


def test_resurfacing_returns_empty_list_without_history(client: TestClient) -> None:
    response = client.get('/api/resurfacing')

    assert response.status_code == 200
    assert response.json() == []
