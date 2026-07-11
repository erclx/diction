"""Interview eye-contact separation eval.

Measures whether the shipped eye-contact metric separates a lens-look from an
off-axis screen-glance, and records why the metric scores head yaw plus iris but
not pitch. Runs the real MediaPipe FaceLandmarker over the two calibration clips,
dumps every frame's yaw, pitch, and iris offset, and sweeps the yaw threshold to
show where the looking-percentage separates the two takes.

This is a two-clip, single-speaker, single-setup separation check, not a fit
against a labeled corpus. It proves the separation exists and picks a directional
threshold to revalidate as more recordings arrive, the same footing as the
composite accentedness and prosody scores.

Needs the scoring-free `interview` extra and the two clips under
`tests/fixtures/interview/video/`, which are gitignored and local to the
real-stack box. Run from `backend/`:

    PYTHONPATH=src uv run python calibration/scripts/eye_contact_eval.py
"""

import json
from pathlib import Path
from statistics import mean, median

from diction.config import Settings
from diction.interview.face import (
    GAZE_YAW_THRESHOLD_DEG,
    IRIS_OFFSET_THRESHOLD,
    ensure_model,
    iris_offset,
    yaw_pitch_from_matrix,
)

HERE = Path(__file__).parent
DATA_DIR = HERE.parent / 'data'
VIDEO_DIR = HERE.parent.parent / 'tests' / 'fixtures' / 'interview' / 'video'

CLIPS = {'good': 'looked into the lens', 'bad': 'watched the screen beside the lens'}
YAW_SWEEP = [4.0, 5.0, 6.0, 7.0, 8.0, 10.0, 12.0, 15.0]
PRE_FIX_YAW_THRESHOLD_DEG = 15.0


def _measure_clip(video_path: Path, cache_dir: Path) -> dict[str, list[float]]:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision

    from diction.interview.face import _iter_frames

    options = mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(
            model_asset_path=str(ensure_model(cache_dir))
        ),
        running_mode=mp_vision.RunningMode.VIDEO,
        output_facial_transformation_matrixes=True,
        num_faces=1,
    )
    yaws: list[float] = []
    pitches: list[float] = []
    irises: list[float] = []
    with mp_vision.FaceLandmarker.create_from_options(options) as landmarker:
        for _frame_index, image, timestamp_ms in _iter_frames(video_path):
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)
            matrices = getattr(result, 'facial_transformation_matrixes', None) or []
            landmarks_list = getattr(result, 'face_landmarks', None) or []
            if not matrices or not landmarks_list:
                continue
            yaw_deg, pitch_deg = yaw_pitch_from_matrix(matrices[0])
            yaws.append(round(yaw_deg, 2))
            pitches.append(round(pitch_deg, 2))
            irises.append(round(iris_offset(landmarks_list[0]), 4))
    return {'yaw': yaws, 'pitch': pitches, 'iris': irises}


def _axis_summary(values: list[float]) -> dict[str, float]:
    return {
        'median': round(median(values), 2),
        'mean': round(mean(values), 2),
        'min': round(min(values), 2),
        'max': round(max(values), 2),
    }


def _looking_pct(frames: dict[str, list[float]], yaw_threshold_deg: float) -> float:
    yaws = frames['yaw']
    irises = frames['iris']
    looking = sum(
        1
        for yaw, iris in zip(yaws, irises, strict=True)
        if abs(yaw) <= yaw_threshold_deg and iris <= IRIS_OFFSET_THRESHOLD
    )
    return round(100.0 * looking / len(yaws), 1)


def main() -> None:
    settings = Settings()
    frames = {
        name: _measure_clip(VIDEO_DIR / f'{name}.mp4', settings.mediapipe_cache_dir)
        for name in CLIPS
    }

    clips = {
        name: {
            'note': CLIPS[name],
            'face_frames': len(data['yaw']),
            'yaw': _axis_summary(data['yaw']),
            'pitch': _axis_summary(data['pitch']),
            'iris': _axis_summary(data['iris']),
            'yaw_samples': data['yaw'],
            'pitch_samples': data['pitch'],
        }
        for name, data in frames.items()
    }

    sweep = [
        {
            'yaw_threshold_deg': threshold,
            'good_looking_pct': _looking_pct(frames['good'], threshold),
            'bad_looking_pct': _looking_pct(frames['bad'], threshold),
            'separation_pct': round(
                _looking_pct(frames['good'], threshold)
                - _looking_pct(frames['bad'], threshold),
                1,
            ),
        }
        for threshold in YAW_SWEEP
    ]

    report = {
        'description': (
            'Interview eye-contact separation on two calibration clips. '
            'Two-clip, single-speaker directional check, not a corpus fit.'
        ),
        'shipped_yaw_threshold_deg': GAZE_YAW_THRESHOLD_DEG,
        'pre_fix_yaw_threshold_deg': PRE_FIX_YAW_THRESHOLD_DEG,
        'iris_threshold': IRIS_OFFSET_THRESHOLD,
        'clips': clips,
        'yaw_sweep': sweep,
    }
    DATA_DIR.mkdir(exist_ok=True)
    out = DATA_DIR / 'eye_contact_eval.json'
    out.write_text(json.dumps(report, indent=2))
    print(f'wrote {out}')
    for row in sweep:
        print(
            f'  yaw<={row["yaw_threshold_deg"]:>4}: '
            f'good={row["good_looking_pct"]:5.1f}  '
            f'bad={row["bad_looking_pct"]:5.1f}  '
            f'sep={row["separation_pct"]:+5.1f}'
        )


if __name__ == '__main__':
    main()
