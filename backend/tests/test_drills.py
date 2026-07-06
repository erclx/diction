from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

from diction.api.drills import get_scorer
from diction.app import create_app
from diction.db.engine import get_session, make_engine
from diction.scoring.audio import (
    MIN_CLIP_SECONDS,
    MIN_WORD_CLIP_SECONDS,
    ClipTooWeakError,
)
from diction.scoring.types import ContrastResult
from diction.storage import sessions as sessions_storage


class FakeScorer:
    def __init__(self, result: ContrastResult) -> None:
        self._result = result
        self.received_min_clip_seconds: float | None = None

    def score_target_contrast(
        self,
        word: str,
        audio: bytes,
        target_phoneme: str,
        competitor_phoneme: str,
        min_clip_seconds: float = MIN_CLIP_SECONDS,
    ) -> ContrastResult:
        self.received_min_clip_seconds = min_clip_seconds
        return self._result


class RaisingScorer:
    def score_target_contrast(
        self,
        word: str,
        audio: bytes,
        target_phoneme: str,
        competitor_phoneme: str,
        min_clip_seconds: float = MIN_CLIP_SECONDS,
    ) -> ContrastResult:
        raise ClipTooWeakError('duration=0.10s below 1.0s minimum')


def _clean_result() -> ContrastResult:
    return ContrastResult(phoneme_quality=97.0, target_substituted=False)


def _substituted_result() -> ContrastResult:
    return ContrastResult(phoneme_quality=60.0, target_substituted=True)


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
        data={'word': 'walk', 'target_phoneme': 'ɔ', 'competitor_phoneme': 'ɒ'},
        files={'audio': ('clip.webm', b'fake-bytes', 'audio/webm')},
    )


def test_correct_target_returns_no_flagged_phonemes_and_writes_no_session(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_clean_result())

    response = _post(client)

    assert response.status_code == 200
    assert response.json()['phoneme_quality'] == 97.0
    assert response.json()['flagged_phonemes'] == []
    with Session(engine) as session:
        assert sessions_storage.list_sessions(session) == []


def test_substituted_target_returns_its_flagged_phoneme_and_writes_no_session(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(
        _substituted_result()
    )

    response = _post(client)

    assert response.status_code == 200
    assert response.json()['phoneme_quality'] == 60.0
    assert response.json()['flagged_phonemes'] == ['ɔ']
    with Session(engine) as session:
        assert sessions_storage.list_sessions(session) == []


def test_too_weak_clip_returns_422(client: TestClient) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: RaisingScorer()

    response = _post(client)

    assert response.status_code == 422
    assert response.json()['error'] == 'clip_too_weak'


def test_drill_route_requests_the_word_clip_floor(client: TestClient) -> None:
    scorer = FakeScorer(_clean_result())
    client.app.dependency_overrides[get_scorer] = lambda: scorer

    _post(client)

    assert scorer.received_min_clip_seconds == MIN_WORD_CLIP_SECONDS
