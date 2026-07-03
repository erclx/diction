from pathlib import Path

from diction.tts.cache import ReferenceAudioCache, cache_key


def test_cache_key_is_stable_for_the_same_text_and_voice() -> None:
    assert cache_key('hello', 'lessac') == cache_key('hello', 'lessac')


def test_cache_key_differs_by_text() -> None:
    assert cache_key('hello', 'lessac') != cache_key('world', 'lessac')


def test_cache_key_differs_by_voice() -> None:
    assert cache_key('hello', 'lessac') != cache_key('hello', 'ryan')


def test_get_returns_none_on_a_miss(tmp_path: Path) -> None:
    cache = ReferenceAudioCache(tmp_path)

    assert cache.get('hello', 'lessac') is None


def test_put_then_get_returns_the_stored_audio(tmp_path: Path) -> None:
    cache = ReferenceAudioCache(tmp_path)

    cache.put('hello', 'lessac', b'wav-bytes')

    assert cache.get('hello', 'lessac') == b'wav-bytes'


def test_put_writes_a_file_keyed_by_text_and_voice(tmp_path: Path) -> None:
    cache = ReferenceAudioCache(tmp_path)

    cache.put('hello', 'lessac', b'wav-bytes')

    assert cache.path_for('hello', 'lessac').exists()
    assert cache.get('hello', 'ryan') is None
