"""Real-stack separation harness for the interview CV scorer.

The two clips are a deliberately-good and a deliberately-bad delivery of the same
recorded answer. The corrected posture and eye-contact signals must separate them
for the vendored pipeline to be trustworthy. This is the acceptance gate for the
CV foundation, so it asserts the good take reads materially better than the bad
take rather than freezing absolute values, which the still-open real-recording
calibration will move.

This runs on the real stack only, gated behind `DICTION_INTERVIEW_REGRESSION` so
the default `uv run pytest` (and CI, which cannot run MediaPipe) never loads it.
Both clips must be present under `tests/fixtures/interview/video/`; repopulate
them from each clip's `source` path in `manifest.json`. Run it explicitly:

    DICTION_INTERVIEW_REGRESSION=1 uv run pytest tests/test_interview_regression.py
"""

import json
import os
from pathlib import Path
from typing import cast

import pytest

from diction.interview.types import InterviewReport

FIXTURES_DIR = Path(__file__).parent / 'fixtures' / 'interview'
MANIFEST = FIXTURES_DIR / 'manifest.json'

pytestmark = pytest.mark.skipif(
    os.environ.get('DICTION_INTERVIEW_REGRESSION') != '1',
    reason='real-stack interview separation; set DICTION_INTERVIEW_REGRESSION=1 to run',
)


def _manifest() -> dict[str, object]:
    return cast(dict[str, object], json.loads(MANIFEST.read_text()))


def _clip_path(name: str) -> Path:
    clips = cast(dict[str, dict[str, str]], _manifest()['clips'])
    return FIXTURES_DIR / clips[name]['video']


def _separation() -> dict[str, float]:
    return cast(dict[str, float], _manifest()['separation'])


@pytest.fixture(scope='session')
def scored_clips() -> dict[str, InterviewReport]:
    pytest.importorskip('mediapipe')
    pytest.importorskip('av')
    good_path = _clip_path('good')
    bad_path = _clip_path('bad')
    if not good_path.exists() or not bad_path.exists():
        pytest.skip('interview clips absent; repopulate video/ from manifest sources')

    from diction.config import Settings
    from diction.interview.scorer_cv import CvInterviewScorer

    scorer = CvInterviewScorer(Settings(use_stub_interview=False))
    return {'good': scorer.score(good_path), 'bad': scorer.score(bad_path)}


def test_eye_contact_separates_good_from_bad(
    scored_clips: dict[str, InterviewReport],
) -> None:
    good = scored_clips['good'].eye_contact.looking_pct
    bad = scored_clips['bad'].eye_contact.looking_pct

    assert good - bad >= _separation()['eye_contact_min_separation_pct']


def test_gesture_ratio_separates_good_from_bad(
    scored_clips: dict[str, InterviewReport],
) -> None:
    good = scored_clips['good'].posture.gesture_ratio
    bad = scored_clips['bad'].posture.gesture_ratio

    assert good - bad >= _separation()['gesture_ratio_min_separation']


def test_shoulder_tilt_reads_near_level_on_both_clips(
    scored_clips: dict[str, InterviewReport],
) -> None:
    ceiling = _separation()['tilt_level_ceiling_deg']

    assert scored_clips['good'].posture.shoulder_tilt_deg < ceiling
    assert scored_clips['bad'].posture.shoulder_tilt_deg < ceiling
