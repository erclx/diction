from pathlib import Path
from typing import Protocol

from diction.interview.types import (
    EyeContactSummary,
    InterviewReport,
    PostureSummary,
)

STUB_STABILITY = 0.90
STUB_GESTURE_RATIO = 0.30
STUB_SHOULDER_TILT_DEG = 3.0
STUB_EYE_CONTACT_PCT = 75.0


class InterviewScorer(Protocol):
    def score(self, video_path: Path) -> InterviewReport: ...


class StubInterviewScorer:
    """Canned CV metrics behind the real contract. Used in CI and e2e, where
    there is no MediaPipe model download and no GPU. Fixed mid-range values, so
    delivery-report assertions stay stable."""

    def score(self, video_path: Path) -> InterviewReport:
        return InterviewReport(
            posture=PostureSummary(
                stability=STUB_STABILITY,
                gesture_ratio=STUB_GESTURE_RATIO,
                shoulder_tilt_deg=STUB_SHOULDER_TILT_DEG,
            ),
            eye_contact=EyeContactSummary(looking_pct=STUB_EYE_CONTACT_PCT),
        )
