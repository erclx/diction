from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

from diction.api.free_topic import get_critic, get_transcriber
from diction.api.passages import get_scorer
from diction.app import create_app
from diction.config import Settings, get_settings
from diction.db.engine import get_session, make_engine
from diction.feedback.base import StubCritic
from diction.feedback.types import Critique
from diction.scoring.audio import MIN_CLIP_SECONDS, ClipTooWeakError
from diction.scoring.transcription_base import StubTranscriber, Transcript
from diction.scoring.types import FlaggedWordResult, ScoreResult
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


class RaisingCritic:
    def critique(self, transcript: str, topic: str | None) -> Critique:
        raise ConnectionError('ollama is not running')


class RecordingCritic:
    def __init__(self) -> None:
        self.received_transcript: str | None = None
        self.received_topic: str | None = None

    def critique(self, transcript: str, topic: str | None) -> Critique:
        self.received_transcript = transcript
        self.received_topic = topic
        return Critique(points=('point one', 'point two'))


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
        'we drives to the park'
    )
    app.dependency_overrides[get_critic] = lambda: StubCritic()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _fixed_result() -> ScoreResult:
    return ScoreResult(
        completeness=90.0,
        accuracy=80.0,
        fluency=70.0,
        phoneme_quality=60.0,
        flagged_words=[
            FlaggedWordResult(word='drives', start=1.0, end=1.4, phoneme='v')
        ],
    )


def _post(client: TestClient, topic: str | None = 'A recent trip') -> object:
    data = {'topic': topic} if topic is not None else {}
    return client.post(
        '/api/free-topic/score',
        data=data,
        files={'audio': ('clip.webm', b'fake-bytes', 'audio/webm')},
    )


def test_score_returns_transcript_critique_and_scores_and_persists(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_fixed_result())

    response = _post(client)

    assert response.status_code == 200
    body = response.json()
    assert body['transcript'] == 'we drives to the park'
    assert len(body['critique']) >= 1
    assert body['phoneme_quality'] == 60.0
    assert body['flagged_words'][0]['phoneme'] == 'v'
    with Session(engine) as session:
        saved = sessions_storage.list_sessions(session)
        assert len(saved) == 1
        assert saved[0].mode == 'free-topic'
        assert saved[0].transcript == 'we drives to the park'
        assert saved[0].critique
        assert saved[0].flagged_words[0].word == 'drives'


def test_score_scores_the_clip_against_its_own_transcript(
    client: TestClient,
) -> None:
    scorer = FakeScorer(_fixed_result())
    client.app.dependency_overrides[get_scorer] = lambda: scorer

    _post(client)

    assert scorer.received_passage == 'we drives to the park'


def test_score_passes_the_transcript_and_topic_to_the_critic(
    client: TestClient,
) -> None:
    critic = RecordingCritic()
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_fixed_result())
    client.app.dependency_overrides[get_critic] = lambda: critic

    _post(client, topic='My hometown')

    assert critic.received_transcript == 'we drives to the park'
    assert critic.received_topic == 'My hometown'


def test_score_persists_the_default_critique_when_the_critic_fails(
    client: TestClient, engine: Engine
) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_fixed_result())
    client.app.dependency_overrides[get_critic] = lambda: RaisingCritic()

    response = _post(client)

    assert response.status_code == 200
    assert response.json()['critique']
    assert response.json()['phoneme_quality'] == 60.0
    with Session(engine) as session:
        saved = sessions_storage.list_sessions(session)
        assert len(saved) == 1
        assert saved[0].critique


def test_score_returns_422_for_a_too_weak_clip(client: TestClient) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: RaisingScorer()

    response = _post(client)

    assert response.status_code == 422
    assert response.json()['error'] == 'clip_too_weak'


def test_score_accepts_a_missing_topic(client: TestClient) -> None:
    client.app.dependency_overrides[get_scorer] = lambda: FakeScorer(_fixed_result())

    response = _post(client, topic=None)

    assert response.status_code == 200


def test_stub_transcriber_returns_matching_text_and_word_timings() -> None:
    transcriber = StubTranscriber()

    transcript = transcriber.transcribe(b'ignored')

    assert transcript.text
    assert transcript.words == transcriber.word_timings(b'ignored')
