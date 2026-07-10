from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from diction.api.content import get_generator
from diction.app import create_app
from diction.feedback.base import (
    ContentKind,
    StubContentGenerator,
    default_content,
    default_passage,
)


class RaisingGenerator:
    def generate(self, kind: ContentKind, focus_phonemes: list[str]) -> str:
        raise ConnectionError('ollama is not running')


class RecordingGenerator:
    def __init__(self) -> None:
        self.received_kind: ContentKind | None = None
        self.received_focus: list[str] | None = None

    def generate(self, kind: ContentKind, focus_phonemes: list[str]) -> str:
        self.received_kind = kind
        self.received_focus = focus_phonemes
        return 'A generated line to read aloud.'


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


@pytest.mark.parametrize('kind', ['passage', 'shadowing', 'stress'])
def test_generate_passes_the_kind_to_the_generator(
    client: TestClient, kind: ContentKind
) -> None:
    generator = RecordingGenerator()
    client.app.dependency_overrides[get_generator] = lambda: generator

    response = client.post('/api/content/generate', json={'kind': kind})

    assert response.status_code == 200
    assert generator.received_kind == kind


@pytest.mark.parametrize('kind', ['passage', 'shadowing', 'stress'])
def test_generate_returns_the_kind_fallback_when_the_generator_fails(
    client: TestClient, kind: ContentKind
) -> None:
    client.app.dependency_overrides[get_generator] = RaisingGenerator

    response = client.post('/api/content/generate', json={'kind': kind})

    assert response.status_code == 200
    assert response.json()['text'] == default_content(kind)


def test_generate_rejects_an_unknown_kind(client: TestClient) -> None:
    response = client.post('/api/content/generate', json={'kind': 'sonnet'})

    assert response.status_code == 422
