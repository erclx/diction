---
description: Enforce model loading, inference, and packaging conventions for the backend
paths:
  - 'backend/**/*.py'
---

# MODEL RUNTIME STANDARDS

## Packaging

- Keep the model stack (`torch`, `torchaudio`, `transformers`, `faster-whisper`, `phonemizer`, `soundfile`) in the `scoring` optional dependency group, never in base dependencies.
- Pin `torch` and `torchaudio` to the CUDA 12.8 index through `[tool.uv.sources]`, required for the RTX 5090.
- Import the model libraries only inside the module that runs inference, so importing the scorer protocol or the stub never pulls them in.

## Loading

- Load models once in the app `lifespan`, never per request.
- Provide a stub scorer behind the same protocol, selected by `Settings.use_stub_scorer`, for CI and any environment without a GPU.

## Inference

- Run blocking GPU inference in the threadpool. Use a `def` route or `run_in_threadpool`, never an `async def` body, per `.claude/rules/framework/220-fastapi.md`.
- Decode uploaded audio at the boundary with `ffmpeg` to 16 kHz mono. Do not assume the browser sends WAV.
- Keep the `phonemizer` phone `Separator` when phonemizing. Without it every phoneme drops as unknown and the score is a false pass.

## Testing

- Unit-test the GOP aggregation and thresholds against synthetic posteriors, with no model download.
- Keep the scoring math in a model-free module so those tests need neither a GPU nor the `scoring` extra.
