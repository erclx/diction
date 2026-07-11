"""The real CV interview scorer. Runs the MediaPipe pose and face landmarkers
over a recorded answer to derive posture and eye-contact signals. This module
top-imports `av` and `mediapipe` from the optional `interview` dependency group,
so importing it without the extra raises `ModuleNotFoundError` at the app
lifespan, where the guard turns it into an actionable `uv sync --extra interview`
message. The pose and face math, the protocol, and the stub import cleanly
without the extra, since only this module pulls the heavy libraries."""

from pathlib import Path

import av  # noqa: F401
import mediapipe  # noqa: F401

from diction.config import Settings
from diction.interview.face import detect_eye_contact, summarize_eye_contact
from diction.interview.pose import detect_pose, summarize_posture
from diction.interview.types import InterviewReport


class CvInterviewScorer:
    def __init__(self, settings: Settings) -> None:
        self._cache_dir = settings.mediapipe_cache_dir

    def score(self, video_path: Path) -> InterviewReport:
        posture = summarize_posture(detect_pose(video_path, cache_dir=self._cache_dir))
        eye_contact = summarize_eye_contact(
            detect_eye_contact(video_path, cache_dir=self._cache_dir)
        )
        return InterviewReport(posture=posture, eye_contact=eye_contact)
