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
- Wrap a secondary enrichment call that runs after the primary result (an LLM explanation after a score) in a try/except at the route boundary that degrades to a fallback. Only the primary model may fail the request. The computed result must still persist and return.

## Testing

- Unit-test the GOP aggregation and thresholds against synthetic posteriors, with no model download.
- Keep the scoring math in a model-free module so those tests need neither a GPU nor the `scoring` extra.
- Before trusting a model-backed feature, run it against the real stack (the Ollama model, the Piper voice, the `scoring` extra), not only stub and unit tests. A real-API mismatch or a slow reasoning pass ships green otherwise.
- Set `think=False` for reasoning models doing terse structured output. The hidden thinking pass otherwise dominates latency for no gain on the answer.
- When a change adds a model or service to the app `lifespan`, wire its `DICTION_USE_STUB_*` flag into `.github/workflows/verify.yml` and boot the backend on that flag before shipping. Unit tests never start the app.
