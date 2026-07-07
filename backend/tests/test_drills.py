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
from diction.storage import drills as drills_storage
from diction.storage import sessions as sessions_storage


class FakeScorer:
    def __init__(self, result: ContrastResult, heard: str = 'walk') -> None:
        self._result = result
        self._heard = heard
        self.received_min_clip_seconds: float | None = None
        self.scored = False

    def recognize_word(self, audio: bytes, expected_words: list[str]) -> str:
        return self._heard

    def score_target_contrast(
        self,
        word: str,
        audio: bytes,
        target_phoneme: str,
        competitor_phoneme: str,
        min_clip_seconds: float = MIN_CLIP_SECONDS,
    ) -> ContrastResult:
        self.scored = True
        self.received_min_clip_seconds = min_clip_seconds
        return self._result


class RaisingScorer:
    def recognize_word(self, audio: bytes, expected_words: list[str]) -> str:
        return ''

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
        data={
            'word': 'walk',
            'competitor_word': 'wok',
            'target_phoneme': 'ɔ',
            'competitor_phoneme': 'ɒ',
        },
        files={'audio': ('clip.webm', b'fake-bytes', 'audio/webm')},
    )


def test_correct_target_returns_no_flagged_phonemes_and_writes_no_session(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_clean_result())

    response = _post(client)

    assert response.status_code == 200
    assert response.json()['said_expected_word'] is True
    assert response.json()['phoneme_quality'] == 97.0
    assert response.json()['flagged_phonemes'] == []
    with Session(engine) as session:
        assert sessions_storage.list_sessions(session) == []


def test_scored_production_rep_persists_a_passed_drill_rep(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_clean_result())

    _post(client)

    with Session(engine) as session:
        reps = drills_storage.list_drill_reps(session)
    assert len(reps) == 1
    assert reps[0].mode == 'production'
    assert reps[0].target == 'ɔ'
    assert reps[0].passed is True
    assert reps[0].score is None


def test_substituted_production_rep_persists_a_failed_drill_rep(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(
        _substituted_result()
    )

    _post(client)

    with Session(engine) as session:
        reps = drills_storage.list_drill_reps(session)
    assert len(reps) == 1
    assert reps[0].passed is False


def test_unrecognized_word_persists_no_drill_rep(
    client: TestClient, engine: Engine
) -> None:
    scorer = FakeScorer(_clean_result(), heard='rabbit')
    client.app.dependency_overrides[get_scorer] = lambda: scorer

    _post(client)

    with Session(engine) as session:
        assert drills_storage.list_drill_reps(session) == []


def test_unrecognized_word_skips_scoring_and_writes_no_session(
    client: TestClient, engine: Engine
) -> None:
    scorer = FakeScorer(_clean_result(), heard='rabbit')
    client.app.dependency_overrides[get_scorer] = lambda: scorer

    response = _post(client)

    assert response.status_code == 200
    assert response.json()['said_expected_word'] is False
    assert response.json()['flagged_phonemes'] == []
    assert scorer.scored is False
    with Session(engine) as session:
        assert sessions_storage.list_sessions(session) == []


def test_competitor_word_still_earns_a_verdict(
    client: TestClient, engine: Engine
) -> None:
    scorer = FakeScorer(_substituted_result(), heard='wok')
    client.app.dependency_overrides[get_scorer] = lambda: scorer

    response = _post(client)

    assert response.status_code == 200
    assert response.json()['said_expected_word'] is True
    assert scorer.scored is True


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


def test_ear_training_rep_persists_a_correct_answer(
    client: TestClient, engine: Engine
) -> None:
    response = client.post(
        '/api/drills/ear-training/rep',
        data={'target_phoneme': 'ɔ', 'correct': 'true'},
    )

    assert response.status_code == 200
    assert response.json()['recorded'] is True
    with Session(engine) as session:
        reps = drills_storage.list_drill_reps(session)
    assert len(reps) == 1
    assert reps[0].mode == 'ear-training'
    assert reps[0].target == 'ɔ'
    assert reps[0].passed is True
    assert reps[0].score is None


def test_ear_training_rep_persists_an_incorrect_answer(
    client: TestClient, engine: Engine
) -> None:
    response = client.post(
        '/api/drills/ear-training/rep',
        data={'target_phoneme': 'ɒ', 'correct': 'false'},
    )

    assert response.status_code == 200
    with Session(engine) as session:
        reps = drills_storage.list_drill_reps(session)
    assert reps[0].passed is False
