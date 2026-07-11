"""Frozen value objects for the interview CV pipeline."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Landmark:
    x: float
    y: float
    visibility: float


@dataclass(frozen=True, slots=True)
class PoseSample:
    frame_index: int
    nose: Landmark
    left_shoulder: Landmark
    right_shoulder: Landmark
    left_wrist: Landmark
    right_wrist: Landmark
    left_hip: Landmark
    right_hip: Landmark


@dataclass(frozen=True, slots=True)
class EyeContactSample:
    frame_index: int
    is_looking: bool


@dataclass(frozen=True, slots=True)
class EyeContactSummary:
    looking_pct: float


@dataclass(frozen=True, slots=True)
class PostureSummary:
    stability: float
    gesture_ratio: float
    shoulder_tilt_deg: float


@dataclass(frozen=True, slots=True)
class InterviewReport:
    """The computer-vision half of the interview report: posture and eye contact.
    The v1 metric set also names delivery (pace, fillers, pauses, duration), which
    a later PR adds by composing the existing Whisper transcriber. Extend this
    report with those fields rather than treating it as the complete contract."""

    posture: PostureSummary
    eye_contact: EyeContactSummary
