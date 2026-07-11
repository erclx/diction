"""MediaPipe FaceLandmarker wrapper plus head-pose-aware gaze classification.

Eye-contact scores gaze against an absolute forward axis, with no per-clip
baseline subtraction, so a take held off-axis from the first frame reads as
off-axis rather than being normalized against its own skewed opening. The signal
is head yaw (horizontal angle to the lens) plus iris offset, both near zero means
looking at the lens. Pitch is deliberately excluded: the webcam sits above the
monitor, so a straight lens-look already tilts the face up several degrees, which
makes an absolute pitch axis camera-dependent rather than a clean forward
reference. Yaw carries the separation because the lens is horizontally centered,
so looking at it means a yaw near zero regardless of the vertical offset. The
real-recording gate confirmed a lens-look and an off-axis screen-glance separate
cleanly on yaw. The threshold stays a directional placeholder, calibrated on two
clips, the same footing as the composite accentedness and prosody scores.

mediapipe and av are in the optional `interview` dependency group, imported only
inside the detection function so importing the gaze math never pulls them in.
"""

import math
import urllib.request
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

from diction.interview.types import EyeContactSample, EyeContactSummary

GAZE_YAW_THRESHOLD_DEG: float = 7.0
IRIS_OFFSET_THRESHOLD: float = 0.18

MEDIAPIPE_FACE_MODEL_URL: str = (
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/'
    'face_landmarker/float16/latest/face_landmarker.task'
)
_MODEL_FILENAME: str = 'face_landmarker.task'

_LEFT_IRIS_CENTER_INDEX: int = 468
_RIGHT_IRIS_CENTER_INDEX: int = 473
_LEFT_EYE_INNER_INDEX: int = 133
_LEFT_EYE_OUTER_INDEX: int = 33
_RIGHT_EYE_INNER_INDEX: int = 362
_RIGHT_EYE_OUTER_INDEX: int = 263


@dataclass(frozen=True, slots=True)
class _RawSample:
    frame_index: int
    yaw_deg: float
    iris_offset: float


def detect_eye_contact(
    video_path: Path,
    *,
    cache_dir: Path,
    yaw_threshold_deg: float = GAZE_YAW_THRESHOLD_DEG,
) -> list[EyeContactSample]:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision

    model_path = ensure_model(cache_dir)
    options = mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp_vision.RunningMode.VIDEO,
        output_facial_transformation_matrixes=True,
        num_faces=1,
    )

    raw_samples: list[_RawSample] = []
    with mp_vision.FaceLandmarker.create_from_options(options) as landmarker:
        for frame_index, image, timestamp_ms in _iter_frames(video_path):
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)
            sample = _raw_sample_from_result(result, frame_index)
            if sample is not None:
                raw_samples.append(sample)

    return classify_samples(raw_samples, yaw_threshold_deg=yaw_threshold_deg)


def summarize_eye_contact(samples: list[EyeContactSample]) -> EyeContactSummary:
    if not samples:
        return EyeContactSummary(looking_pct=0.0)
    looking_count = sum(1 for sample in samples if sample.is_looking)
    return EyeContactSummary(looking_pct=100.0 * looking_count / len(samples))


def ensure_model(cache_dir: Path) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    model_path = cache_dir / _MODEL_FILENAME
    if not model_path.exists():
        urllib.request.urlretrieve(MEDIAPIPE_FACE_MODEL_URL, model_path)
    return model_path


def yaw_pitch_from_matrix(matrix: list[list[float]]) -> tuple[float, float]:
    yaw_rad = math.atan2(matrix[0][2], matrix[2][2])
    pitch_rad = math.asin(max(-1.0, min(1.0, -matrix[1][2])))
    return math.degrees(yaw_rad), math.degrees(pitch_rad)


def iris_offset(landmarks: list[object]) -> float:
    left = _single_eye_offset(
        landmarks, _LEFT_IRIS_CENTER_INDEX, _LEFT_EYE_INNER_INDEX, _LEFT_EYE_OUTER_INDEX
    )
    right = _single_eye_offset(
        landmarks,
        _RIGHT_IRIS_CENTER_INDEX,
        _RIGHT_EYE_INNER_INDEX,
        _RIGHT_EYE_OUTER_INDEX,
    )
    return (abs(left) + abs(right)) / 2.0


def is_looking(
    *,
    yaw_deg: float,
    iris_offset_value: float,
    yaw_threshold_deg: float = GAZE_YAW_THRESHOLD_DEG,
) -> bool:
    head_aligned = abs(yaw_deg) <= yaw_threshold_deg
    iris_centered = iris_offset_value <= IRIS_OFFSET_THRESHOLD
    return head_aligned and iris_centered


def classify_samples(
    raw_samples: list[_RawSample],
    *,
    yaw_threshold_deg: float = GAZE_YAW_THRESHOLD_DEG,
) -> list[EyeContactSample]:
    return [
        EyeContactSample(
            frame_index=sample.frame_index,
            is_looking=is_looking(
                yaw_deg=sample.yaw_deg,
                iris_offset_value=sample.iris_offset,
                yaw_threshold_deg=yaw_threshold_deg,
            ),
        )
        for sample in raw_samples
    ]


def _single_eye_offset(
    landmarks: list[object], iris_index: int, inner_index: int, outer_index: int
) -> float:
    iris_x = float(getattr(landmarks[iris_index], 'x'))  # noqa: B009
    inner_x = float(getattr(landmarks[inner_index], 'x'))  # noqa: B009
    outer_x = float(getattr(landmarks[outer_index], 'x'))  # noqa: B009
    eye_center_x = (inner_x + outer_x) / 2.0
    eye_width = max(abs(outer_x - inner_x), 1e-6)
    return (iris_x - eye_center_x) / eye_width


def _raw_sample_from_result(result: object, frame_index: int) -> _RawSample | None:
    matrices = getattr(result, 'facial_transformation_matrixes', None) or []
    landmarks_list = getattr(result, 'face_landmarks', None) or []
    if not matrices or not landmarks_list:
        return None
    yaw_deg, _pitch_deg = yaw_pitch_from_matrix(matrices[0])
    return _RawSample(
        frame_index=frame_index,
        yaw_deg=yaw_deg,
        iris_offset=iris_offset(landmarks_list[0]),
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
