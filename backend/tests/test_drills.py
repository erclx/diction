from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

from diction.api.drills import get_scorer
from diction.app import create_app
from diction.db.engine import get_session, make_engine
from diction.scoring.audio import ClipTooWeakError
from diction.scoring.types import FlaggedWordResult, ScoreResult
from diction.storage import sessions as sessions_storage


class FakeScorer:
    def __init__(self, result: ScoreResult) -> None:
        self._result = result

    def score(self, passage: str, audio: bytes) -> ScoreResult:
        return self._result


class RaisingScorer:
    def score(self, passage: str, audio: bytes) -> ScoreResult:
        raise ClipTooWeakError('duration=0.10s below 1.0s minimum')


def _clean_result() -> ScoreResult:
    return ScoreResult(
        completeness=100.0,
        accuracy=96.0,
        fluency=94.0,
        phoneme_quality=97.0,
        flagged_words=[],
    )


def _flagged_result() -> ScoreResult:
    return ScoreResult(
        completeness=100.0,
        accuracy=70.0,
        fluency=80.0,
        phoneme_quality=60.0,
        flagged_words=[FlaggedWordResult(word='walk', start=0.1, end=0.5, phoneme='ɔ')],
    )


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


def _post(client: TestClient) -> object:
    return client.post(
        '/api/drills/minimal-pair/score',
        data={'word': 'walk'},
        files={'audio': ('clip.webm', b'fake-bytes', 'audio/webm')},
    )


def test_clean_word_returns_no_flags_and_writes_no_session(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_clean_result())

    response = _post(client)

    assert response.status_code == 200
    assert response.json()['flagged_words'] == []
    with Session(engine) as session:
        assert sessions_storage.list_sessions(session) == []


def test_flagged_word_returns_the_target_phoneme_with_an_explanation(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_flagged_result())

    response = _post(client)

    assert response.status_code == 200
    flagged = response.json()['flagged_words']
    assert flagged[0]['phoneme'] == 'ɔ'
    assert 'ɔ' in flagged[0]['explanation']
    with Session(engine) as session:
        assert sessions_storage.list_sessions(session) == []


def test_too_weak_clip_returns_422(client: TestClient) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: RaisingScorer()

    response = _post(client)

    assert response.status_code == 422
    assert response.json()['error'] == 'clip_too_weak'
