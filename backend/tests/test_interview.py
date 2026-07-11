from pathlib import Path

from diction.interview.base import (
    STUB_EYE_CONTACT_PCT,
    STUB_SHOULDER_TILT_DEG,
    StubInterviewScorer,
)
from diction.interview.face import is_looking, summarize_eye_contact
from diction.interview.pose import summarize_posture
from diction.interview.types import EyeContactSample, Landmark, PoseSample


def _landmark(x: float, y: float, visibility: float = 1.0) -> Landmark:
    return Landmark(x=x, y=y, visibility=visibility)


def _pose_sample(left_shoulder: Landmark, right_shoulder: Landmark) -> PoseSample:
    return PoseSample(
        frame_index=0,
        nose=_landmark(0.5, 0.3),
        left_shoulder=left_shoulder,
        right_shoulder=right_shoulder,
        left_wrist=_landmark(0.6, 0.8, visibility=0.0),
        right_wrist=_landmark(0.4, 0.8, visibility=0.0),
        left_hip=_landmark(0.6, 0.9),
        right_hip=_landmark(0.4, 0.9),
    )


def test_level_shoulders_fold_to_near_zero_tilt() -> None:
    level = _pose_sample(_landmark(0.6, 0.50), _landmark(0.4, 0.51))

    summary = summarize_posture([level])

    assert summary.shoulder_tilt_deg < 10.0


def test_lateral_lean_reads_a_large_tilt() -> None:
    leaning = _pose_sample(_landmark(0.6, 0.40), _landmark(0.4, 0.60))

    summary = summarize_posture([leaning])

    assert summary.shoulder_tilt_deg > 30.0


def test_gaze_on_the_forward_axis_counts_as_looking() -> None:
    looking = is_looking(yaw_deg=2.0, iris_offset_value=0.05)

    assert looking is True


def test_head_turned_off_the_lens_axis_does_not_count_as_looking() -> None:
    off_axis = is_looking(yaw_deg=10.0, iris_offset_value=0.05)

    assert off_axis is False


def test_eyes_cut_aside_with_head_forward_does_not_count_as_looking() -> None:
    iris_cut = is_looking(yaw_deg=1.0, iris_offset_value=0.30)

    assert iris_cut is False


def test_eye_contact_summary_is_the_looking_fraction() -> None:
    samples = [
        EyeContactSample(frame_index=0, is_looking=True),
        EyeContactSample(frame_index=1, is_looking=True),
        EyeContactSample(frame_index=2, is_looking=False),
        EyeContactSample(frame_index=3, is_looking=True),
    ]

    summary = summarize_eye_contact(samples)

    assert summary.looking_pct == 75.0


def test_empty_pose_samples_report_zeroed_posture() -> None:
    summary = summarize_posture([])

    assert (summary.stability, summary.gesture_ratio, summary.shoulder_tilt_deg) == (
        0.0,
        0.0,
        0.0,
    )


def test_stub_scorer_returns_fixed_canned_metrics() -> None:
    report = StubInterviewScorer().score(Path('unused.webm'))

    assert report.eye_contact.looking_pct == STUB_EYE_CONTACT_PCT
    assert report.posture.shoulder_tilt_deg == STUB_SHOULDER_TILT_DEG
