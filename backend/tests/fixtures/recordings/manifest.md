<!-- cspell:ignore wery -->

# Recording fixtures

Real recordings with documented ground truth. A fixed clip scored through the deterministic pipeline returns the same scores and flags every run (#36), so each clip is a regression fixture, not just a sample. `manifest.json` is the machine-readable source the harness asserts against. This file is the human ground truth behind those numbers. Keep the two in sync when a clip is added or an expected value changes.

## Layout

- `manifest.json`: committed, one entry per clip, the exact values `tests/test_fixtures_regression.py` asserts.
- `manifest.md`: this file, the ground-truth narrative.
- `audio/`: gitignored, the actual clips. Local to the real-stack box, not committed. Repopulate from each clip's `source` path in `manifest.json`.

Audio is not committed because the harness only runs where the `scoring` extra and the GPU live, and CI runs stub-only. The manifest is the shared artifact, and the audio sits beside it locally.

## Running the harness

The harness is real-stack only and stays out of the default `uv run pytest` and CI. Run it explicitly from `backend/`:

```bash
DICTION_FIXTURE_REGRESSION=1 uv run pytest tests/test_fixtures_regression.py
```

It loads the real scorer once, scores each clip whose audio is present, and asserts the flagged word-and-phoneme sequence and the score bands (within `score_tolerance`). A clip whose audio is absent is skipped, so a fresh checkout with an empty `audio/` collects nothing rather than failing. Repopulate `audio/` from the `source` paths first.

## Ground truth

Flags are asserted as an ordered `(word, phoneme)` sequence. Scores are asserted within `score_tolerance` (2.0 points). The pipeline is deterministic, but scores are calibrated as directional, so a small band catches a real regression without freezing a placeholder to the decimal. Playback spans stay stable too but are not asserted. The flagged word and its phoneme are the semantic signal.

Where the current scorer output is a known miss or a known false flag, the entry says so. The harness freezes current behavior so a change is caught. This narrative records which frozen values are correct and which document a bug still to fix, per the honesty constraint in the plan.

### passage-clean

A careful, correct read of the default passage:

> The three brothers thought about the weather. They walked through the thick forest and found a very old ship near the river.

No planted errors, and the scorer flags nothing. This is the clean baseline: a regression that starts false-flagging a correct read trips this fixture.

### passage-degraded

The same passage with six planted substitutions: three → "tree", thought → "fought", weather → "wedder", thick → "tick", very → "wery", ship → "sheep".

Caught, correctly, four of the six planted errors: `thought` /θ/, `weather` /ð/, `thick` /θ/, `very` /v/.

Missed two, consistent with the passage-scoring spike's known limits: `three` (the θ drop under-detects) and `ship` (the ɪ → iː vowel-length error under-detects). These are documented misses, not correct passes.

The scorer also raises four flags on words that were read correctly: `brothers` /ð/, `walked` /t/, `forest` /ɪ/, `and` /d/. These are the known connected-speech-reduction false flags on function words and reduced targets. They are frozen here so the harness guards current behavior, but they are bugs to fix in calibration, not confirmed errors.

### free-topic-last-weekend-2

A free-topic clip. Reference-free: the harness transcribes the clip and scores it against its own transcript, so the frozen transcript is asserted too and Whisper drift is caught alongside score drift. The transcript carries the learner's grammar errors ("I have gone", "my friend was", "we drive", "we decide"), which belong to the free-topic grammar critique, a separate path this fixture does not exercise.

The five pronunciation flags (`and` /d/ ×2, `very` /v/, `to` /uː/ ×2) are all function-word reductions of the same class as the passage-degraded false flags. Treat them as a current-behavior guard, not as confirmed mispronunciations.

### drill-minimal-pair

Pending. No real learner isolated-word clip exists yet, and the single-word spike used TTS audio, which the plan rules out as an unmeasured proxy. During a dogfooding drill, record one clip that says the wrong side of a contrast (for example "free" for "three"), promote it to `audio/drill-*.wav`, and fill `word`, `target_phoneme`, `competitor_phoneme`, and the expected verdict in `manifest.json` from a capture run. The harness already has the drill assertion wired and will pick the clip up once its audio and fields are present.
