from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from diction.api.prosody import get_prosody_scorer, get_synth
from diction.app import create_app
from diction.scoring.prosody import (
    ProsodyResult,
    compare_prosody,
    intonation_match,
    rhythm_match,
)
from diction.tts.base import StubSynthesizer


def _rising(points: int) -> list[float]:
    return [100.0 + step * 12.0 for step in range(points)]


def test_intonation_match_is_high_for_identical_contours() -> None:
    contour = _rising(20)

    result = intonation_match(contour, contour)

    assert result > 99.0


def test_intonation_match_is_low_for_a_flattened_contour() -> None:
    varied = _rising(20)
    flat = [120.0] * 20

    varied_score = intonation_match(varied, varied)
    flat_score = intonation_match(varied, flat)

    assert flat_score < varied_score
    assert flat_score < 50.0


def test_intonation_match_is_low_for_an_inverted_contour() -> None:
    rising = _rising(20)
    falling = list(reversed(rising))

    assert intonation_match(rising, falling) < intonation_match(rising, rising)


def test_intonation_match_ignores_absolute_pitch_offset() -> None:
    low_voice = _rising(20)
    high_voice = [frequency * 2.0 for frequency in low_voice]

    assert intonation_match(low_voice, high_voice) > 99.0


def test_intonation_match_is_zero_when_a_contour_has_no_voiced_frames() -> None:
    assert intonation_match([0.0, 0.0], _rising(10)) == 0.0


def test_rhythm_match_is_high_for_identical_timings() -> None:
    timings = [(0.0, 0.4), (0.4, 1.0), (1.0, 1.2)]

    result = rhythm_match(timings, timings)

    assert result > 99.0


def test_rhythm_match_ignores_overall_tempo() -> None:
    slow = [(0.0, 0.4), (0.4, 1.0), (1.0, 1.2)]
    fast = [(0.0, 0.2), (0.2, 0.5), (0.5, 0.6)]

    assert rhythm_match(slow, fast) > 99.0


def test_rhythm_match_is_low_for_an_evened_out_delivery() -> None:
    varied = [(0.0, 0.1), (0.1, 0.9), (0.9, 1.0)]
    even = [(0.0, 0.4), (0.4, 0.8), (0.8, 1.2)]

    assert rhythm_match(varied, even) < rhythm_match(varied, varied)


def test_compare_prosody_returns_both_axes() -> None:
    contour = _rising(20)
    timings = [(0.0, 0.4), (0.4, 1.0)]

    result = compare_prosody(contour, contour, timings, timings)

    assert isinstance(result, ProsodyResult)
    assert result.rhythm_match > 99.0
    assert result.intonation_match > 99.0


class FakeProsodyScorer:
    def __init__(self, result: ProsodyResult) -> None:
        self._result = result
        self.received: tuple[bytes, bytes] | None = None

    def score(self, reference_audio: bytes, learner_audio: bytes) -> ProsodyResult:
        self.received = (reference_audio, learner_audio)
        return self._result


@pytest.fixture
def client() -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_synth] = lambda: StubSynthesizer()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _post(client: TestClient, reference_text: str = 'the thick fog') -> object:
    return client.post(
        '/api/prosody/score',
        data={'reference_text': reference_text},
        files={'audio': ('clip.webm', b'fake-bytes', 'audio/webm')},
    )


def test_score_returns_both_prosody_axes(client: TestClient) -> None:
    scorer = FakeProsodyScorer(ProsodyResult(rhythm_match=72.0, intonation_match=63.0))
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    response = _post(client)

    assert response.status_code == 200
    body = response.json()
    assert body['rhythm_match'] == 72.0
    assert body['intonation_match'] == 63.0


def test_score_synthesizes_the_reference_before_scoring(client: TestClient) -> None:
    scorer = FakeProsodyScorer(ProsodyResult(rhythm_match=50.0, intonation_match=50.0))
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    _post(client)

    assert scorer.received is not None
    reference_audio, learner_audio = scorer.received
    assert reference_audio == StubSynthesizer().synthesize('the thick fog')
    assert learner_audio == b'fake-bytes'


def test_score_rejects_blank_reference_text(client: TestClient) -> None:
    scorer = FakeProsodyScorer(ProsodyResult(rhythm_match=50.0, intonation_match=50.0))
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    response = _post(client, reference_text='   ')

    assert response.status_code == 422
