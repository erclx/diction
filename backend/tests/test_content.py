from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from diction.api.content import get_generator
from diction.app import create_app
from diction.feedback.base import StubContentGenerator, default_passage


class RaisingGenerator:
    def generate(self, focus_phonemes: list[str]) -> str:
        raise ConnectionError('ollama is not running')


class RecordingGenerator:
    def __init__(self) -> None:
        self.received_focus: list[str] | None = None

    def generate(self, focus_phonemes: list[str]) -> str:
        self.received_focus = focus_phonemes
        return 'A generated passage to read aloud.'


@pytest.fixture
def client() -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_generator] = StubContentGenerator
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_generate_returns_a_passage(client: TestClient) -> None:
    response = client.post('/api/content/generate', json={'kind': 'passage'})

    assert response.status_code == 200
    assert response.json()['text'] == default_passage()


def test_generate_defaults_the_kind_to_passage(client: TestClient) -> None:
    response = client.post('/api/content/generate', json={})

    assert response.status_code == 200
    assert response.json()['text']


def test_generate_passes_the_focus_phonemes_to_the_generator(
    client: TestClient,
) -> None:
    generator = RecordingGenerator()
    client.app.dependency_overrides[get_generator] = lambda: generator

    response = client.post(
        '/api/content/generate',
        json={'kind': 'passage', 'focus_phonemes': ['θ', 'v']},
    )

    assert response.status_code == 200
    assert generator.received_focus == ['θ', 'v']


def test_generate_returns_the_fallback_passage_when_the_generator_fails(
    client: TestClient,
) -> None:
    client.app.dependency_overrides[get_generator] = RaisingGenerator

    response = client.post('/api/content/generate', json={'kind': 'passage'})

    assert response.status_code == 200
    assert response.json()['text'] == default_passage()


def test_generate_rejects_an_unknown_kind(client: TestClient) -> None:
    response = client.post('/api/content/generate', json={'kind': 'shadowing'})

    assert response.status_code == 422
