---
title: TTS
description: Local text-to-speech subsystem for native reference audio, its synthesizer protocol, stub, and disk cache
---

# TTS

The synthesis subsystem behind `GET /api/reference`. It renders native reference audio for the passage and for individual flagged words, so the user can compare their own recording against a correct pronunciation. It follows the scoring subsystem's optional-dependency plus stub pattern.

## Layer responsibilities

- `tts/base.py` owns the `Synthesizer` protocol and the `StubSynthesizer`, which returns a canned wav with no model download.
- `tts/synth_kokoro.py` owns the real `KokoroSynthesizer`, importing `kokoro` only inside the module.
- `tts/cache.py` owns the disk cache `ReferenceAudioCache` and the `CachedSynthesizer` wrapper that serves repeated text from disk.
- `tts/voices.py` owns the curated registry of offered English Kokoro voices, the single source of truth for which voice ids are valid.
- `api/reference.py` owns the HTTP route, boundary validation, and the wav response. `api/voices.py` owns `GET /api/voices` and the shared `validate_voice` boundary check.

## Decisions

- The synthesizer is chosen once in the lifespan from `Settings.use_stub_synth` and held on `app.state.synth`, injected through `get_synth`. The optional-dependency and stub rationale mirrors the scorer and lives in `.claude/ARCHITECTURE.md`.
- The real synth is warmed once during the lifespan, after wiring `app.state.synth`, by an awaited `asyncio.to_thread` call to the inner `KokoroSynthesizer` on a throwaway constant, so the first user reference click pays no first-inference cost. The warm-up runs the inner synth directly, not the `CachedSynthesizer`, to skip writing a junk cache entry, and is awaited rather than fire-and-forget to satisfy `.claude/rules/core/020-concurrency.md`. The stub skips it, being already instant. This warms reference audio only. The scorer, prosody, and Whisper models still load lazily on first request.
- Kokoro-82M replaced Piper as the reference voice, listen-confirmed clearly more natural in a `dev:real` A/B, with `af_heart` the default voice. `Settings.tts_voice` is now a string voice id, not an onnx path, and is the fallback default when a request names no voice. The `Synthesizer` protocol keeps the engine swap contained to the synth module.
- The reference and prosody routes take an optional per-request `voice`, so the user picks which Kokoro voice speaks. The client sends the choice per request and the server holds no per-user voice state, matching the single-user, no-auth design. `synthesize(text, voice=None)` resolves `None` to `Settings.tts_voice`, so an absent voice keeps the default.
- The real Kokoro synth is wrapped in `CachedSynthesizer`, which keys each clip on a `kokoro-` prefixed identity of the resolved voice, so clips for different voices never collide and pre-swap Piper-keyed entries never serve. The stub is used directly, since it is already deterministic and instant.
- Synthesis is blocking, so the route runs it through `run_in_threadpool` under an `asyncio.wait_for` timeout rather than an `async def` body, per `.claude/rules/framework/220-fastapi.md`.
- Runtime conventions are enforced by `.claude/rules/lib/360-model-runtime.md`.

## Hidden contracts

- The route returns raw `audio/wav`, which the browser plays through a plain `HTMLAudioElement`. It must not route through the own-span Web Audio decode path, which exists only to seek unseekable WebM. Kokoro renders at 24 kHz mono, the stub at 22.05 kHz.
- The cache key is a SHA-256 hash of `voice` and `text`. The fixed passage and repeated words synthesize once, then serve from disk.
- Reference text is validated at the boundary: 1 to 600 characters, rejected as 422 when blank after trimming. A named voice is validated against the registry through `validate_voice`, rejected as 422 when unknown, before any synthesis runs.
- The registry in `tts/voices.py` is a hand-maintained constant, since Kokoro exposes no clean list API. It carries English voices only, per the language non-goal in `.claude/REQUIREMENTS.md`. A new Kokoro voice is a one-line addition there.
- Cache files stay under a local `Settings.reference_cache_dir`, never fetched over the network, per the offline constraint in `.claude/REQUIREMENTS.md`.

## Gotchas

- `KokoroSynthesizer` runs only with the `tts` extra installed and never in CI. Set `DICTION_USE_STUB_SYNTH=true` to run against the stub.
- Kokoro self-downloads `hexgrad/Kokoro-82M` from HuggingFace on first construction, so the first real boot is slow while the model caches. Its `misaki` g2p needs `misaki[en]`, `espeakng-loader`, and the `en_core_web_sm` spacy model in the extra, plus the system `espeak-ng` already present for scoring, or it lazy-installs the espeak loader or the spacy model at synth time. `en_core_web_sm` is pinned via a wheel URL in `[tool.uv.sources]` so `uv sync` installs it up front rather than spacy fetching it mid-boot, which otherwise triggers a uvicorn reload.
- The `scoring` extra uses `phonemizer-fork`, not `phonemizer`. Both claim the `phonemizer` import namespace, so installing both alongside `misaki` (which needs `phonemizer-fork`'s `EspeakWrapper.set_data_path`) collides. `phonemizer-fork` is a drop-in for the scoring `phonemize` and `Separator` calls.
- The backend pins Python 3.13 (`backend/.python-version`, `requires-python = ">=3.12,<3.14"`) because `spacy`, pulled by `misaki[en]`, has no CPython 3.14 wheel.
- The disk cache writes a temp file then `replace`s it. Concurrent first-time synthesis of the same text is not guarded, but the frontend never issues it: TanStack Query dedupes identical `queryKey` fetches and the tool is single-user.
