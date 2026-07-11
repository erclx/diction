---
title: Interview
description: Computer-vision scorer for interview delivery: posture and eye-contact signals from a recorded answer, its protocol, stub, and separation harness
---

# Interview

The CV scoring subsystem for interview practice mode. It runs the MediaPipe pose and face landmarkers over a recorded answer to derive posture and eye-contact signals, the delivery half of the combined interview report that stacks alongside the reused GOP pronunciation scores. The pipeline was vendored and adapted from a portable computer-vision scorer built for a separate project. It follows the scoring subsystem's optional-dependency plus stub pattern.

This is the foundation PR of the interview arc. The content route (`me/questions.md` parser plus a `DICTION_INTERVIEW_SOURCE_DIR` setting) and the combined report surface are downstream, not here. The delivery-speech metrics (pace, fillers, pauses) also land later, composing the existing Whisper transcriber rather than duplicating faster-whisper.

## Layer responsibilities

- `interview/types.py` owns the frozen value objects: `Landmark`, `PoseSample`, `EyeContactSample`, the two summaries, and the `InterviewReport` that pairs posture with eye contact. No model imports, so the math is unit-tested without the extra.
- `interview/pose.py` owns the pose math (`summarize_posture`, stability, gesture ratio, shoulder tilt) and the MediaPipe PoseLandmarker detection loop. mediapipe and av are imported only inside `detect_pose` and the frame iterator.
- `interview/face.py` owns the gaze math (`is_looking`, `classify_samples`, `summarize_eye_contact`, matrix-to-yaw-pitch) and the MediaPipe FaceLandmarker detection loop, with the same deferred imports.
- `interview/base.py` owns the `InterviewScorer` protocol and the `StubInterviewScorer`, which returns fixed mid-range CV metrics with no model download.
- `interview/scorer_cv.py` owns the real `CvInterviewScorer`, composing the pose and face detectors into one `InterviewReport`. It top-imports `av` and `mediapipe` so a real boot without the extra fails at the lifespan, not at first request.

## Decisions

- The scorer is chosen once in the lifespan from `Settings.use_stub_interview` and held on `app.state.interview_scorer`. The optional-dependency, protocol, and stub rationale mirrors the GOP scorer and lives in `.claude/ARCHITECTURE.md`.
- The pose and face detection functions import mediapipe and av lazily, so `types.py`, the math in `pose.py` and `face.py`, and `base.py` all import without the `interview` extra. Only `scorer_cv.py` top-imports the heavy libraries, which is what makes the lifespan import guard fire with a clear "run uv sync --extra interview" message. This splits from the GOP scorer, whose real module top-imports torch throughout, but keeps the CV math unit-testable on the model-free CI runner.
- Shoulder tilt folds the raw shoulder-line angle with `min(a, 180 - a)`, applied per frame before the median, so a level line reads near 0 rather than the raw ~175 the atan2 and mirroring convention produced. The two original clips both fold to near level (good 5, bad 1 degrees) since neither has a lean, so a third `slouch` clip with a deliberate lateral lean earns the separation proof, reading about 15 degrees. The gate asserts the upright takes stay under 10 degrees and the slouch clears a 10-degree lean floor at least 5 degrees above them.
- Eye contact scores gaze against an absolute forward axis. There is no per-clip baseline subtraction, so a take held off-axis from the first frame reads as off-axis rather than centered against its own skewed opening. This is the load-bearing fix, since a per-clip baseline had read both the on-lens and the off-axis take at 100 percent. Gaze counts as on-lens when head yaw (7 degrees) and iris offset both sit within fixed thresholds. Pitch is excluded on purpose: the webcam sits above the monitor, so a straight lens-look already tilts the face up about 6 degrees, which makes an absolute pitch axis camera-dependent, while yaw stays honest because the lens is horizontally centered. The gate confirmed a lens-look and an off-axis screen-glance separate cleanly on yaw even though both keep the head mostly forward, so the separation lived in a difference the old 15-degree threshold was too loose to catch. The 7-degree threshold is a directional placeholder calibrated on two clips.
- Both signals read as directional pending real-recording validation, the same discipline the composite accentedness and prosody scores follow.

## Hidden contracts

- `CvInterviewScorer.score` takes a video `Path`, not bytes. The downstream content route persists the upload, then passes the path. PyAV decodes both the browser's webm and the mp4 calibration clips, so no transcode step is needed.
- MediaPipe VIDEO running mode requires a strictly increasing per-frame timestamp. The frame iterators derive it from the stream `pts` and `time_base`, falling back to `frame_index / average_rate` when `pts` is absent, then clamp each value to at least the previous plus one. The clamp matters for webm from the browser's MediaRecorder, whose variable frame timing can round two frames to the same millisecond, which would otherwise make `detect_for_video` raise.
- A clip where no face or pose is detected yields empty samples, and the summaries return zeroed values rather than raising.

## Gotchas

- The separation harness (`tests/test_interview_regression.py`) is real-stack only, gated behind `DICTION_INTERVIEW_REGRESSION=1`, since CI cannot run MediaPipe. It asserts relative separation (good reads materially better than bad) rather than absolute score bands, because the still-open real-recording calibration will move the absolute numbers. The clips are gitignored under `tests/fixtures/interview/video/` and repopulated from the `source` paths in the manifest. Full ground truth in `tests/fixtures/interview/manifest.md`.
- Runtime conventions are enforced by `.claude/rules/lib/360-model-runtime.md`.
