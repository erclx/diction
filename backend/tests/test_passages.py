from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

from diction.api.passages import get_explainer, get_scorer
from diction.app import create_app
from diction.db.engine import get_session, make_engine
from diction.feedback.base import StubExplainer
from diction.feedback.types import FlaggedWordContext
from diction.scoring.audio import MIN_CLIP_SECONDS, ClipTooWeakError
from diction.scoring.types import FlaggedWordResult, ScoreResult
from diction.storage import sessions as sessions_storage


class FakeScorer:
    def __init__(self, result: ScoreResult) -> None:
        self._result = result
        self.received_min_clip_seconds: float | None = None

    def score(
        self, passage: str, audio: bytes, min_clip_seconds: float = MIN_CLIP_SECONDS
    ) -> ScoreResult:
        self.received_min_clip_seconds = min_clip_seconds
        return self._result


class RaisingScorer:
    def score(
        self, passage: str, audio: bytes, min_clip_seconds: float = MIN_CLIP_SECONDS
    ) -> ScoreResult:
        raise ClipTooWeakError('duration=0.10s below 1.0s minimum')


class RaisingExplainer:
    def explain(self, flagged_words: list[FlaggedWordContext]) -> list[str]:
        raise ConnectionError('ollama is not running')


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
    app.dependency_overrides[get_explainer] = lambda: StubExplainer()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _post(client: TestClient) -> object:
    return client.post(
        '/api/passages/score',
        data={'passage': 'the thick fog'},
        files={'audio': ('clip.webm', b'fake-bytes', 'audio/webm')},
    )


def test_score_returns_scores_and_persists_the_session(
    client: TestClient, engine: Engine
) -> None:
    result = ScoreResult(
        completeness=90.0,
        accuracy=80.0,
        fluency=70.0,
        phoneme_quality=60.0,
        flagged_words=[
            FlaggedWordResult(word='thick', start=1.0, end=1.3, phoneme='θ')
        ],
    )
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(result)

    response = _post(client)

    assert response.status_code == 200
    body = response.json()
    assert body['phoneme_quality'] == 60.0
    assert body['flagged_words'][0]['phoneme'] == 'θ'
    assert 'θ' in body['flagged_words'][0]['explanation']
    with Session(engine) as session:
        saved = sessions_storage.list_sessions(session)
        assert len(saved) == 1
        assert saved[0].flagged_words[0].word == 'thick'
        assert saved[0].flagged_words[0].phoneme == 'θ'


def test_score_persists_template_explanations_when_the_explainer_fails(
    client: TestClient, engine: Engine
) -> None:
    result = ScoreResult(
        completeness=90.0,
        accuracy=80.0,
        fluency=70.0,
        phoneme_quality=60.0,
        flagged_words=[
            FlaggedWordResult(word='thick', start=1.0, end=1.3, phoneme='θ')
        ],
    )
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(result)
    client.app.dependency_overrides[get_explainer] = lambda: RaisingExplainer()

    response = _post(client)

    assert response.status_code == 200
    assert 'θ' in response.json()['flagged_words'][0]['explanation']
    with Session(engine) as session:
        saved = sessions_storage.list_sessions(session)
        assert len(saved) == 1
        assert saved[0].flagged_words[0].word == 'thick'


def test_score_returns_422_for_a_too_weak_clip(client: TestClient) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: RaisingScorer()

    response = _post(client)

    assert response.status_code == 422
    assert response.json()['error'] == 'clip_too_weak'


def test_passage_route_requests_the_default_clip_floor(client: TestClient) -> None:
    result = ScoreResult(
        completeness=90.0,
        accuracy=80.0,
        fluency=70.0,
        phoneme_quality=60.0,
        flagged_words=[],
    )
    scorer = FakeScorer(result)
    client.app.dependency_overrides[get_scorer] = lambda: scorer

    _post(client)

    assert scorer.received_min_clip_seconds == MIN_CLIP_SECONDS
