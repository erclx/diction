from fastapi.testclient import TestClient

from diction.app import create_app
from diction.drills.minimal_pairs_data import MINIMAL_PAIR_CONTRASTS


def make_client() -> TestClient:
    return TestClient(create_app())


def test_full_set_returns_every_contrast_with_word_pairs() -> None:
    client = make_client()

    response = client.get('/api/minimal-pairs')

    assert response.status_code == 200
    body = response.json()
    assert len(body) == len(MINIMAL_PAIR_CONTRASTS)
    assert all(len(contrast['pairs']) >= 1 for contrast in body)
    first = body[0]
    assert {'phoneme_a', 'phoneme_b', 'label', 'pairs'} <= first.keys()
    assert {'word_a', 'word_b'} <= first['pairs'][0].keys()


def test_phoneme_filter_returns_only_contrasts_training_that_phoneme() -> None:
    client = make_client()

    response = client.get('/api/minimal-pairs', params={'phoneme': 'θ'})

    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert all(
        'θ' in (contrast['phoneme_a'], contrast['phoneme_b']) for contrast in body
    )


def test_phoneme_filter_round_trips_a_known_key() -> None:
    client = make_client()

    response = client.get('/api/minimal-pairs', params={'phoneme': 'ð'})

    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert body[0]['phoneme_a'] == 'ð'


def test_unknown_phoneme_returns_empty_list_with_200() -> None:
    client = make_client()

    response = client.get('/api/minimal-pairs', params={'phoneme': 'zzz'})

    assert response.status_code == 200
    assert response.json() == []
