"""MediaPipe PoseLandmarker wrapper plus posture-signal math.

Three derived signals per clip:
  stability:     1 minus normalized std of nose+shoulder bbox center
  gesture_ratio: fraction of frames with at least one wrist visible above hip
  shoulder_tilt: absolute deviation of the shoulder line from level, in degrees,
                 where 0 is level and a larger value is more lateral lean

Detection decodes with PyAV and runs the MediaPipe Tasks PoseLandmarker in
running_mode=VIDEO. The model bundle auto-downloads to cache_dir on first run.
mediapipe and av are in the optional `interview` dependency group, imported only
inside the detection functions so importing the posture math never pulls them in.
"""

import math
import urllib.request
from collections.abc import Iterator
from pathlib import Path
from statistics import StatisticsError, pstdev

from diction.interview.types import Landmark, PoseSample, PostureSummary

_VISIBILITY_THRESHOLD: float = 0.5

MEDIAPIPE_POSE_MODEL_URL: str = (
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/'
    'pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
)
_MODEL_FILENAME: str = 'pose_landmarker_lite.task'

_NOSE_INDEX: int = 0
_LEFT_SHOULDER_INDEX: int = 11
_RIGHT_SHOULDER_INDEX: int = 12
_LEFT_WRIST_INDEX: int = 15
_RIGHT_WRIST_INDEX: int = 16
_LEFT_HIP_INDEX: int = 23
_RIGHT_HIP_INDEX: int = 24


def detect_pose(video_path: Path, *, cache_dir: Path) -> list[PoseSample]:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision

    model_path = ensure_model(cache_dir)
    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp_vision.RunningMode.VIDEO,
        num_poses=1,
        output_segmentation_masks=False,
    )

    samples: list[PoseSample] = []
    with mp_vision.PoseLandmarker.create_from_options(options) as landmarker:
        for frame_index, image, timestamp_ms in _iter_frames(video_path):
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)
            sample = _pose_sample_from_result(result, frame_index)
            if sample is not None:
                samples.append(sample)

    return samples


def summarize_posture(samples: list[PoseSample]) -> PostureSummary:
    if not samples:
        return PostureSummary(stability=0.0, gesture_ratio=0.0, shoulder_tilt_deg=0.0)
    return PostureSummary(
        stability=_stability(samples),
        gesture_ratio=_gesture_ratio(samples),
        shoulder_tilt_deg=_shoulder_tilt(samples),
    )


def ensure_model(cache_dir: Path) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    model_path = cache_dir / _MODEL_FILENAME
    if not model_path.exists():
        urllib.request.urlretrieve(MEDIAPIPE_POSE_MODEL_URL, model_path)
    return model_path


def pose_sample_from_landmarks(
    landmarks: list[object], *, frame_index: int
) -> PoseSample:
    return PoseSample(
        frame_index=frame_index,
        nose=_landmark_at(landmarks, _NOSE_INDEX),
        left_shoulder=_landmark_at(landmarks, _LEFT_SHOULDER_INDEX),
        right_shoulder=_landmark_at(landmarks, _RIGHT_SHOULDER_INDEX),
        left_wrist=_landmark_at(landmarks, _LEFT_WRIST_INDEX),
        right_wrist=_landmark_at(landmarks, _RIGHT_WRIST_INDEX),
        left_hip=_landmark_at(landmarks, _LEFT_HIP_INDEX),
        right_hip=_landmark_at(landmarks, _RIGHT_HIP_INDEX),
    )


def _stability(samples: list[PoseSample]) -> float:
    centers_x = [
        (s.nose.x + s.left_shoulder.x + s.right_shoulder.x) / 3.0 for s in samples
    ]
    centers_y = [
        (s.nose.y + s.left_shoulder.y + s.right_shoulder.y) / 3.0 for s in samples
    ]
    shoulder_widths = [
        max(1e-6, abs(s.left_shoulder.x - s.right_shoulder.x)) for s in samples
    ]
    median_width = sorted(shoulder_widths)[len(shoulder_widths) // 2]
    try:
        std_x = pstdev(centers_x)
        std_y = pstdev(centers_y)
    except StatisticsError:
        return 1.0
    drift = math.hypot(std_x, std_y) / median_width
    return max(0.0, min(1.0, 1.0 - drift))


def _gesture_ratio(samples: list[PoseSample]) -> float:
    gesture_frames = sum(
        1
        for s in samples
        if _wrist_above_hip(s.left_wrist, s.left_hip)
        or _wrist_above_hip(s.right_wrist, s.right_hip)
    )
    return gesture_frames / len(samples)


def _wrist_above_hip(wrist: Landmark, hip: Landmark) -> bool:
    return wrist.visibility >= _VISIBILITY_THRESHOLD and wrist.y < hip.y


def _shoulder_tilt(samples: list[PoseSample]) -> float:
    folded_angles = [_level_deviation_deg(s) for s in samples]
    return sorted(folded_angles)[len(folded_angles) // 2]


def _level_deviation_deg(sample: PoseSample) -> float:
    raw = abs(
        math.degrees(
            math.atan2(
                sample.right_shoulder.y - sample.left_shoulder.y,
                sample.right_shoulder.x - sample.left_shoulder.x,
            )
        )
    )
    return min(raw, 180.0 - raw)


def _pose_sample_from_result(result: object, frame_index: int) -> PoseSample | None:
    landmarks_list = getattr(result, 'pose_landmarks', None) or []
    if not landmarks_list:
        return None
    return pose_sample_from_landmarks(landmarks_list[0], frame_index=frame_index)


def _landmark_at(landmarks: list[object], index: int) -> Landmark:
    raw = landmarks[index]
    return Landmark(
        x=float(getattr(raw, 'x')),  # noqa: B009
        y=float(getattr(raw, 'y')),  # noqa: B009
        visibility=float(getattr(raw, 'visibility', 0.0)),
    )


def _iter_frames(video_path: Path) -> Iterator[tuple[int, object, int]]:
    import av

    with av.open(str(video_path)) as container:
        stream = container.streams.video[0]
        time_base = float(stream.time_base) if stream.time_base else 0.0
        average_rate = float(stream.average_rate) if stream.average_rate else 30.0
        for frame_index, frame in enumerate(container.decode(stream)):
            if frame.pts is not None and time_base:
                timestamp_ms = int(frame.pts * time_base * 1000)
            else:
                timestamp_ms = int(frame_index * 1000 / average_rate)
            yield frame_index, frame.to_ndarray(format='rgb24'), timestamp_ms
