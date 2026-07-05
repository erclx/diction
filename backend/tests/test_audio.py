import array

import pytest

from diction.scoring.audio import (
    MIN_CLIP_SECONDS,
    MIN_WORD_CLIP_SECONDS,
    TARGET_SAMPLE_RATE,
    ClipTooWeakError,
    DecodedAudio,
    ensure_scorable,
)


def make_audio(seconds: float, amplitude: float) -> DecodedAudio:
    count = int(seconds * TARGET_SAMPLE_RATE)
    return DecodedAudio(
        samples=array.array('f', [amplitude] * count),
        sample_rate=TARGET_SAMPLE_RATE,
    )


def test_ensure_scorable_rejects_a_too_short_clip() -> None:
    audio = make_audio(MIN_CLIP_SECONDS / 2, amplitude=0.5)

    with pytest.raises(ClipTooWeakError):
        ensure_scorable(audio)


def test_ensure_scorable_rejects_a_silent_clip() -> None:
    audio = make_audio(MIN_CLIP_SECONDS * 2, amplitude=0.0)

    with pytest.raises(ClipTooWeakError):
        ensure_scorable(audio)


def test_ensure_scorable_accepts_a_loud_enough_clip() -> None:
    audio = make_audio(MIN_CLIP_SECONDS * 2, amplitude=0.5)

    ensure_scorable(audio)


def test_ensure_scorable_accepts_a_single_word_clip_at_the_word_floor() -> None:
    audio = make_audio(0.5, amplitude=0.5)

    ensure_scorable(audio, min_seconds=MIN_WORD_CLIP_SECONDS)


def test_ensure_scorable_rejects_a_single_word_clip_at_the_default_floor() -> None:
    audio = make_audio(0.5, amplitude=0.5)

    with pytest.raises(ClipTooWeakError):
        ensure_scorable(audio)


def test_ensure_scorable_rejects_true_silence_length_at_the_word_floor() -> None:
    audio = make_audio(0.3, amplitude=0.5)

    with pytest.raises(ClipTooWeakError):
        ensure_scorable(audio, min_seconds=MIN_WORD_CLIP_SECONDS)
