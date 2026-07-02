from diction.scoring.text import normalize_word


def test_normalize_word_strips_trailing_punctuation() -> None:
    assert normalize_word('fog.') == 'fog'


def test_normalize_word_lowercases() -> None:
    assert normalize_word('The') == 'the'


def test_normalize_word_strips_the_leading_space_whisper_emits() -> None:
    assert normalize_word(' the') == 'the'


def test_normalize_word_matches_spoken_and_expected_forms() -> None:
    assert normalize_word('fog.') == normalize_word('Fog')
