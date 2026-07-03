---
title: TTS
description: Local text-to-speech subsystem for native reference audio, its synthesizer protocol, stub, and disk cache
---

# TTS

The synthesis subsystem behind `GET /api/reference`. It renders native reference audio for the passage and for individual flagged words, so the user can compare their own recording against a correct pronunciation. It follows the scoring subsystem's optional-dependency plus stub pattern.

## Layer responsibilities

- `tts/base.py` owns the `Synthesizer` protocol and the `StubSynthesizer`, which returns a canned wav with no model download.
- `tts/synth_piper.py` owns the real `PiperSynthesizer`, importing `piper` only inside the module.
- `tts/cache.py` owns the disk cache `ReferenceAudioCache` and the `CachedSynthesizer` wrapper that serves repeated text from disk.
- `api/reference.py` owns the HTTP route, boundary validation, and the wav response.

## Decisions

- The synthesizer is chosen once in the lifespan from `Settings.use_stub_synth` and held on `app.state.synth`, injected through `get_synth`. The optional-dependency and stub rationale mirrors the scorer and lives in `.claude/ARCHITECTURE.md`.
- Piper is the v0.2 default over XTTS: fast, small, and fully offline, since reference playback needs neither voice cloning nor studio realism. The `Synthesizer` protocol keeps a later XTTS swap contained to the synth module.
- The real Piper synth is wrapped in `CachedSynthesizer`. The stub is used directly, since it is already deterministic and instant.
- Synthesis is blocking, so the route runs it through `run_in_threadpool` under an `asyncio.wait_for` timeout rather than an `async def` body, per `.claude/rules/framework/220-fastapi.md`.
- Runtime conventions are enforced by `.claude/rules/lib/360-model-runtime.md`.

## Hidden contracts

- The route returns raw `audio/wav`, 22.05 kHz mono, which the browser plays through a plain `HTMLAudioElement`. It must not route through the own-span Web Audio decode path, which exists only to seek unseekable WebM.
- The cache key is a SHA-256 hash of `voice` and `text`. The fixed passage and repeated words synthesize once, then serve from disk.
- Reference text is validated at the boundary: 1 to 600 characters, rejected as 422 when blank after trimming.
- Cache files stay under a local `Settings.reference_cache_dir`, never fetched over the network, per the offline constraint in `.claude/REQUIREMENTS.md`.

## Gotchas

- `PiperSynthesizer` runs only with the `tts` extra installed and never in CI. Set `DICTION_USE_STUB_SYNTH=true` to run against the stub.
- The disk cache writes a temp file then `replace`s it. Concurrent first-time synthesis of the same text is not guarded, but the frontend never issues it: TanStack Query dedupes identical `queryKey` fetches and the tool is single-user.
