from collections.abc import Iterator
from datetime import UTC, datetime

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


def test_weak_sounds_ranks_recurring_phonemes(
    client: TestClient, engine: Engine
) -> None:
    record = PracticeSession(
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
        mode='passage',
        completeness=90.0,
        accuracy=80.0,
        fluency=70.0,
        phoneme_quality=60.0,
    )
    record.flagged_words = [
        FlaggedWord(word='this', phoneme='ð', start=0.0, end=0.1, explanation=''),
        FlaggedWord(word='that', phoneme='ð', start=0.2, end=0.3, explanation=''),
        FlaggedWord(word='ship', phoneme='ɪ', start=0.4, end=0.5, explanation=''),
    ]
    with Session(engine) as session:
        save_session(session, record)

    response = client.get('/api/weak-sounds')

    assert response.status_code == 200
    body = response.json()
    assert [row['phoneme'] for row in body] == ['ð', 'ɪ']
    assert body[0]['occurrence_count'] == 2
    assert body[0]['word_count'] == 2
    assert set(body[0]['example_words']) == {'this', 'that'}


def test_weak_sounds_returns_empty_list_without_data(client: TestClient) -> None:
    response = client.get('/api/weak-sounds')

    assert response.status_code == 200
    assert response.json() == []
