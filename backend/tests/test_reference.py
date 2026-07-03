from fastapi.testclient import TestClient

from diction.api.reference import MAX_REFERENCE_TEXT_LENGTH, get_synth
from diction.app import create_app
from diction.tts.base import StubSynthesizer


def make_client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_synth] = lambda: StubSynthesizer()
    return TestClient(app)


def test_reference_returns_a_wav_from_the_stub() -> None:
    client = make_client()

    response = client.get('/api/reference', params={'text': 'hello world'})

    assert response.status_code == 200
    assert response.headers['content-type'] == 'audio/wav'
    assert response.content[:4] == b'RIFF'


def test_reference_rejects_overlong_text() -> None:
    client = make_client()

    response = client.get(
        '/api/reference',
        params={'text': 'a' * (MAX_REFERENCE_TEXT_LENGTH + 1)},
    )

    assert response.status_code == 422


def test_reference_rejects_whitespace_only_text() -> None:
    client = make_client()

    response = client.get('/api/reference', params={'text': '   '})

    assert response.status_code == 422
