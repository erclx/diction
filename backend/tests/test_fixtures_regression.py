"""Real-stack regression harness for the recording fixtures.

Each fixture is a real clip with documented ground truth in
`tests/fixtures/recordings/manifest.json`. Because scoring is pinned
deterministic, a fixed clip returns the same scores and flags every run, so a
drift in either is a regression, not noise.

This runs on the real stack only. It is gated behind `DICTION_FIXTURE_REGRESSION`
so the default `uv run pytest` (and CI, which has no scorer) never loads the
model stack. Run it explicitly:

    DICTION_FIXTURE_REGRESSION=1 uv run pytest tests/test_fixtures_regression.py
"""

import json
import os
from pathlib import Path
from typing import TYPE_CHECKING, cast

import pytest

from diction.scoring.types import ContrastResult, ScoreResult

if TYPE_CHECKING:
    from diction.scoring.base import PassageScorer
    from diction.scoring.transcription import WhisperTranscriber

Clip = dict[str, object]
RealScorer = tuple['PassageScorer', 'WhisperTranscriber']

FIXTURES_DIR = Path(__file__).parent / 'fixtures' / 'recordings'
MANIFEST = FIXTURES_DIR / 'manifest.json'

pytestmark = pytest.mark.skipif(
    os.environ.get('DICTION_FIXTURE_REGRESSION') != '1',
    reason='real-stack fixture regression; set DICTION_FIXTURE_REGRESSION=1 to run',
)


def _manifest() -> dict[str, object]:
    return cast(dict[str, object], json.loads(MANIFEST.read_text()))


def _clips() -> list[Clip]:
    return cast(list[Clip], _manifest()['clips'])


def _score_tolerance() -> float:
    return float(cast(float, _manifest()['score_tolerance']))


def _clips_with_audio(mode: str) -> list[Clip]:
    return [
        clip
        for clip in _clips()
        if clip['mode'] == mode
        and isinstance(clip.get('audio'), str)
        and (FIXTURES_DIR / cast(str, clip['audio'])).exists()
    ]


def _audio_bytes(clip: Clip) -> bytes:
    return (FIXTURES_DIR / cast(str, clip['audio'])).read_bytes()


def _expected(clip: Clip) -> dict[str, object]:
    return cast(dict[str, object], clip['expected'])


def _actual_flag_pairs(result: ScoreResult) -> list[tuple[str, str]]:
    return [(flag.word, flag.phoneme) for flag in result.flagged_words]


def _expected_flag_pairs(clip: Clip) -> list[tuple[str, str]]:
    flagged = cast(list[dict[str, str]], _expected(clip)['flagged'])
    return [(flag['word'], flag['phoneme']) for flag in flagged]


def _scores_out_of_band(result: ScoreResult, clip: Clip, tolerance: float) -> list[str]:
    scores = cast(dict[str, float], _expected(clip)['scores'])
    return [
        f'{key}: expected {value} +/- {tolerance}, got {getattr(result, key):.1f}'
        for key, value in scores.items()
        if abs(getattr(result, key) - value) > tolerance
    ]


@pytest.fixture(scope='session')
def real_scorer() -> RealScorer:
    pytest.importorskip('faster_whisper')
    from diction.config import Settings
    from diction.scoring.scorer_gop import GopScorer
    from diction.scoring.transcription import WhisperTranscriber

    settings = Settings(
        use_stub_scorer=False, use_stub_synth=True, use_stub_explainer=True
    )
    transcriber = WhisperTranscriber(settings)
    return GopScorer(settings, transcriber), transcriber


@pytest.fixture(scope='session')
def scored_fixtures(real_scorer: RealScorer) -> dict[str, tuple[ScoreResult, str]]:
    scorer, transcriber = real_scorer
    scored: dict[str, tuple[ScoreResult, str]] = {}
    for clip in _clips_with_audio('passage'):
        reference = cast(str, clip['reference'])
        result = scorer.score(reference, _audio_bytes(clip))
        scored[cast(str, clip['name'])] = (result, reference)
    for clip in _clips_with_audio('free-topic'):
        audio = _audio_bytes(clip)
        transcript = transcriber.transcribe(audio).text
        scored[cast(str, clip['name'])] = (scorer.score(transcript, audio), transcript)
    return scored


@pytest.fixture(scope='session')
def contrast_fixtures(real_scorer: RealScorer) -> dict[str, ContrastResult]:
    scorer, _ = real_scorer
    scored: dict[str, ContrastResult] = {}
    for clip in _clips_with_audio('drill'):
        result = scorer.score_target_contrast(
            cast(str, clip['word']),
            _audio_bytes(clip),
            cast(str, clip['target_phoneme']),
            cast(str, clip['competitor_phoneme']),
        )
        scored[cast(str, clip['name'])] = result
    return scored


@pytest.mark.parametrize(
    'clip', _clips_with_audio('passage'), ids=lambda clip: cast(str, clip['name'])
)
def test_passage_fixture_flags_match_manifest(
    clip: Clip, scored_fixtures: dict[str, tuple[ScoreResult, str]]
) -> None:
    result, _ = scored_fixtures[cast(str, clip['name'])]
    assert _actual_flag_pairs(result) == _expected_flag_pairs(clip)


@pytest.mark.parametrize(
    'clip', _clips_with_audio('passage'), ids=lambda clip: cast(str, clip['name'])
)
def test_passage_fixture_scores_within_band(
    clip: Clip, scored_fixtures: dict[str, tuple[ScoreResult, str]]
) -> None:
    result, _ = scored_fixtures[cast(str, clip['name'])]
    assert _scores_out_of_band(result, clip, _score_tolerance()) == []


@pytest.mark.parametrize(
    'clip', _clips_with_audio('free-topic'), ids=lambda clip: cast(str, clip['name'])
)
def test_free_topic_fixture_transcript_matches_manifest(
    clip: Clip, scored_fixtures: dict[str, tuple[ScoreResult, str]]
) -> None:
    _, transcript = scored_fixtures[cast(str, clip['name'])]
    assert transcript == _expected(clip)['transcript']


@pytest.mark.parametrize(
    'clip', _clips_with_audio('free-topic'), ids=lambda clip: cast(str, clip['name'])
)
def test_free_topic_fixture_flags_match_manifest(
    clip: Clip, scored_fixtures: dict[str, tuple[ScoreResult, str]]
) -> None:
    result, _ = scored_fixtures[cast(str, clip['name'])]
    assert _actual_flag_pairs(result) == _expected_flag_pairs(clip)


@pytest.mark.parametrize(
    'clip', _clips_with_audio('free-topic'), ids=lambda clip: cast(str, clip['name'])
)
def test_free_topic_fixture_scores_within_band(
    clip: Clip, scored_fixtures: dict[str, tuple[ScoreResult, str]]
) -> None:
    result, _ = scored_fixtures[cast(str, clip['name'])]
    assert _scores_out_of_band(result, clip, _score_tolerance()) == []


@pytest.mark.parametrize(
    'clip', _clips_with_audio('drill'), ids=lambda clip: cast(str, clip['name'])
)
def test_drill_fixture_verdict_matches_manifest(
    clip: Clip, contrast_fixtures: dict[str, ContrastResult]
) -> None:
    result = contrast_fixtures[cast(str, clip['name'])]
    assert result.target_substituted == _expected(clip)['target_substituted']
