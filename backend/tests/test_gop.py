import pytest

from diction.scoring.audio import ClipTooWeakError
from diction.scoring.gop import (
    AlignedPhoneme,
    aggregate_scores,
    completeness,
    normalize_gop,
)
from diction.scoring.phoneme_baselines import FLAG_K, PHONEME_BASELINES


def score_one(word: str, phoneme: str, gop: float) -> list[str]:
    aligned = [make_phoneme(0, word, phoneme, gop)]
    result = aggregate_scores(aligned, [word], [word], [(0.0, 0.3)], 0.3)
    return [flag.phoneme for flag in result.flagged_words]


def make_phoneme(
    word_index: int, word: str, phoneme: str, gop: float
) -> AlignedPhoneme:
    return AlignedPhoneme(
        word_index=word_index, word=word, phoneme=phoneme, gop=gop, start=0.0, end=0.1
    )


def test_normalize_gop_clamps_to_zero_hundred() -> None:
    assert normalize_gop(0.0) == 100.0
    assert normalize_gop(-100.0) == 0.0


def test_normalize_gop_maps_on_the_calibrated_slope() -> None:
    assert normalize_gop(-5.0) == 50.0


def test_completeness_is_fraction_of_expected_words_spoken() -> None:
    result = completeness(['the', 'thick', 'fog'], ['the', 'fog'])

    assert result == 100.0 * 2 / 3


def test_aggregate_flags_the_word_whose_phoneme_falls_below_its_baseline() -> None:
    aligned = [
        make_phoneme(0, 'the', 'ð', -1.0),
        make_phoneme(1, 'thick', 'θ', -8.0),
        make_phoneme(1, 'thick', 'k', -1.0),
    ]

    result = aggregate_scores(
        aligned=aligned,
        expected_words=['the', 'thick'],
        spoken_words=['the', 'thick'],
        spoken_spans=[(0.0, 0.2), (0.2, 0.5)],
        duration=0.5,
    )

    assert [flag.word for flag in result.flagged_words] == ['thick']
    assert result.flagged_words[0].phoneme == 'θ'


def test_a_phoneme_at_its_native_baseline_is_not_flagged() -> None:
    mean, _ = PHONEME_BASELINES['w']

    assert score_one('walk', 'w', mean) == []


def test_a_phoneme_far_below_its_native_baseline_is_flagged() -> None:
    mean, std = PHONEME_BASELINES['w']

    assert score_one('walk', 'w', mean - (FLAG_K + 1.0) * std) == ['w']


def test_one_gop_flags_a_high_baseline_phoneme_but_spares_a_low_baseline_one() -> None:
    shared_gop = -3.0

    assert score_one('walk', 'w', shared_gop) == ['w']
    assert score_one('thin', 'θ', shared_gop) == []


def test_an_uncalibrated_phoneme_is_never_flagged() -> None:
    assert 'zz' not in PHONEME_BASELINES

    assert score_one('word', 'zz', -50.0) == []


def test_aggregate_rejects_an_empty_alignment_instead_of_scoring_perfect() -> None:
    with pytest.raises(ClipTooWeakError):
        aggregate_scores([], ['thick'], ['thick'], [(0.0, 0.3)], 0.3)


def test_flag_span_comes_from_whisper_timing_when_the_word_matches() -> None:
    aligned = [make_phoneme(1, 'thought', 'θ', -8.0)]

    result = aggregate_scores(
        aligned=aligned,
        expected_words=['the', 'thought'],
        spoken_words=['the', 'thought'],
        spoken_spans=[(0.0, 0.4), (4.2, 4.6)],
        duration=5.0,
    )

    assert (result.flagged_words[0].start, result.flagged_words[0].end) == (4.2, 4.6)


def test_flag_span_falls_back_to_alignment_when_the_spoken_word_is_ambiguous() -> None:
    aligned = [
        AlignedPhoneme(
            word_index=1, word='thought', phoneme='θ', gop=-8.0, start=4.4, end=4.5
        )
    ]

    result = aggregate_scores(
        aligned=aligned,
        expected_words=['the', 'thought'],
        spoken_words=['the', 'thoughtful'],
        spoken_spans=[(0.0, 0.4), (4.2, 4.6)],
        duration=5.0,
    )

    assert (result.flagged_words[0].start, result.flagged_words[0].end) == (4.4, 4.5)


def test_flag_span_falls_back_to_alignment_when_the_spoken_word_repeats() -> None:
    aligned = [
        AlignedPhoneme(
            word_index=1, word='thin', phoneme='θ', gop=-8.0, start=1.0, end=1.2
        )
    ]

    result = aggregate_scores(
        aligned=aligned,
        expected_words=['thin', 'thin'],
        spoken_words=['thin', 'thin'],
        spoken_spans=[(0.0, 0.4), (1.0, 1.4)],
        duration=1.5,
    )

    assert (result.flagged_words[0].start, result.flagged_words[0].end) == (1.0, 1.2)


def test_aggregate_phoneme_quality_drops_as_gop_worsens() -> None:
    clean = [make_phoneme(0, 'thick', 'θ', -1.0)]
    degraded = [make_phoneme(0, 'thick', 'θ', -9.0)]

    clean_score = aggregate_scores(clean, ['thick'], ['thick'], [(0.0, 0.3)], 0.3)
    degraded_score = aggregate_scores(degraded, ['thick'], ['thick'], [(0.0, 0.3)], 0.3)

    assert clean_score.phoneme_quality > degraded_score.phoneme_quality
