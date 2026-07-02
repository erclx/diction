_STRIP_CHARS = '.,!?;:"'


def normalize_word(word: str) -> str:
    return word.strip().strip(_STRIP_CHARS).lower()
