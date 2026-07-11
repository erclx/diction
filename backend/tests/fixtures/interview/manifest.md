# Interview CV fixtures

Three real clips used to prove the vendored posture and eye-contact signals separate good delivery from bad: a well-delivered take, a poorly-delivered take, and a deliberate lateral slouch for the posture-tilt signal. `manifest.json` is the machine-readable source the harness asserts against. This file is the human ground truth behind the separation thresholds. Keep the two in sync when a clip or an expected separation changes.

## Layout

- `manifest.json`: committed, the three clip entries and the separation thresholds `tests/test_interview_regression.py` asserts.
- `manifest.md`: this file, the ground-truth narrative.
- `video/`: gitignored, the actual clips. Local to the real-stack box, not committed. Repopulate from each clip's `source` path in `manifest.json`.

Video is not committed because the harness only runs where the `interview` extra and the GPU live, and CI runs stub-only. The clips are large and hold a face, so they stay off the public repo. The manifest is the shared artifact, and the clips sit beside it locally.

The clips live in the main worktree tree only, never in a linked worktree, because a worktree cleanup wipes its own copy. Git does not carry the gitignored `video/` between worktrees, so to run the harness from a linked worktree, copy the clips in first.

## Populating the clips

The clips were recorded from the camera app, so they are mp4 rather than the webm the browser produces in the real flow. Decode handles both. Copy them into place from their source paths:

```bash
mkdir -p backend/tests/fixtures/interview/video
cp "/mnt/c/Users/Eric Le/Pictures/Camera Roll/good.mp4" backend/tests/fixtures/interview/video/good.mp4
cp "/mnt/c/Users/Eric Le/Pictures/Camera Roll/bad.mp4" backend/tests/fixtures/interview/video/bad.mp4
cp "/mnt/c/Users/Eric Le/Pictures/Camera Roll/slouch.mp4" backend/tests/fixtures/interview/video/slouch.mp4
```

## Running the harness

Real-stack only, out of the default `uv run pytest` and CI. Run it from `backend/`:

```bash
DICTION_INTERVIEW_REGRESSION=1 uv run pytest tests/test_interview_regression.py
```

It builds the real CV scorer, scores the three clips, and asserts the separation below. If any clip is absent it skips, so a fresh checkout with an empty `video/` collects nothing rather than failing.

## The separation gate

The gate is honest about what the two clips can and cannot prove, per the plan.

- **Eye contact separates.** The good take looked into the lens, while the bad take watched the screen beside the lens, a subtle off-axis head turn of about 7 degrees rather than a dramatic look-away. The good take must read at least 15 points higher looking-percentage than the bad take. This is the load-bearing proof, since eye contact is the one signal the two clips were recorded to contrast. Two calibration steps earned the separation. First, gaze scores against an absolute forward axis rather than each clip's own opening baseline, which in the pre-fix spike had read both takes at 100 percent. Second, the looking test uses head yaw plus iris only and tightens the yaw threshold to 7 degrees, since the raw signal cleanly separated on yaw (good near 0, bad near minus 7) but the original 15-degree threshold was too loose to catch a 7-degree turn. Pitch is excluded because the webcam sits above the monitor, so a lens-look already tilts the face up about 6 degrees. The clips now read good 96 percent against bad 45 percent, a 51-point separation.
- **Gesture ratio separates.** The spike measured good 0.122 against bad 0.0. The harness asserts the good take keeps a gesture-ratio lead of at least 0.05, a second discriminating signal that survives the vendor unchanged.
- **Shoulder tilt reads near level on the upright takes and separates a slouch.** Neither the good nor the bad take has a lateral lean, so both fold to under 10 degrees rather than the raw ~175 the atan2 convention produced pre-fix. The `slouch` clip, a deliberate lateral lean with one shoulder dropped, reads about 15 degrees, so the harness asserts it clears a 10-degree lean floor and sits at least 5 degrees above the higher of the two upright takes. This earns the tilt-separation proof the two original clips could not, since neither had a lean.
- **Stability is not gated.** Both takes were still (spike good 0.978, bad 0.984). The bad take was a still slouch, not a fidget, so stability has nothing to separate here.

The human runs this gate on the GPU box before merge, since a cold worker and CI cannot run MediaPipe.
