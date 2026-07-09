from fastapi.testclient import TestClient

from diction.api.reference import get_synth
from diction.app import create_app
from diction.tts.base import StubSynthesizer


def make_client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_synth] = lambda: StubSynthesizer()
    return TestClient(app)


def test_voices_lists_known_voices_with_the_default() -> None:
    client = make_client()

    response = client.get('/api/voices')

    assert response.status_code == 200
    body = response.json()
    ids = [voice['id'] for voice in body['voices']]
    assert 'af_heart' in ids
    assert 'am_michael' in ids
    assert body['default'] == 'af_heart'


def test_reference_accepts_a_known_voice() -> None:
    client = make_client()

    response = client.get(
        '/api/reference', params={'text': 'hello world', 'voice': 'am_michael'}
    )

    assert response.status_code == 200
    assert response.content[:4] == b'RIFF'


def test_reference_rejects_an_unknown_voice() -> None:
    client = make_client()

    response = client.get(
        '/api/reference', params={'text': 'hello world', 'voice': 'zz_bogus'}
    )

    assert response.status_code == 422
