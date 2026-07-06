---
title: API
description: FastAPI router layer, route ownership, request validation, model-dependency wiring, and error-response shapes
---

# API

The HTTP layer the React SPA talks to. Every router mounts under `/api` in `create_app`, and each one stays thin: it validates the request, calls into a domain (`scoring`, `feedback`, `tts`, `storage`, `drills`), and maps the result to a response model.

## Layer responsibilities

- `api/health.py` owns `GET /api/health`, a dependency-free liveness probe returning `{status, service}`.
- `api/passages.py` owns `POST /api/passages/score`, the core capture path: it scores an uploaded clip, explains the errors, persists a `PracticeSession`, and returns the scores plus flagged words.
- `api/sessions.py` owns `GET /api/sessions` (newest-first list) and `GET /api/sessions/{session_id}` (one session's detail), both read-only over stored history.
- `api/reference.py` owns `GET /api/reference`, returning native TTS wav bytes for a text query.
- `api/weak_sounds.py` owns `GET /api/weak-sounds`, a cross-session phoneme rollup for the priority list.
- `api/minimal_pairs.py` owns `GET /api/minimal-pairs`, serving curated drill contrasts with an optional `phoneme` filter.
- `api/drills.py` owns `POST /api/drills/minimal-pair/score`, judging one drill word against its contrast through the shared scorer and returning its phoneme-quality score plus the flagged phonemes, with no persistence.
- `api/schemas.py` owns `FlaggedWordResponse`, the one response model shared across routers (`passages` and `sessions` both return it).

## Decisions

- Response models are per-route Pydantic classes defined in the router, kept separate from the `db` table models, so the HTTP contract never tracks the DB shape. `FlaggedWordResponse` is the exception that earns a shared home in `schemas.py` because two routers return it.
- Model implementations resolve from `request.app.state` through thin `get_scorer`, `get_explainer`, and `get_synth` `Depends` shims. The lifespan in `app.py` wires stub or real behind settings flags, so routes never know or import which implementation is resident.
- `score_passage` is a sync `def` so FastAPI runs it in a threadpool, matching its blocking GPU work. `read_reference` is `async` and pushes the blocking `synth.synthesize` into `run_in_threadpool` under a 30s timeout instead, since it shares the event loop with nothing that needs to stay responsive.
- CORS is restricted to an `http://localhost:\d+` origin regex, enforcing the local-only stance at the HTTP boundary.

## Hidden contracts

- Every route lives under the `/api` prefix applied at `include_router`. No handler carries its own prefix, and the frontend keys off `/api`.
- `ClipTooWeakError` maps to a 422 body of `{error: 'clip_too_weak', detail}` through an app-level exception handler in `app.py`, not inside `passages`. The route stays ignorant of the too-weak boundary, and the frontend reads this shape to show a re-record prompt distinct from a generic failure.
- A scored passage is always persisted before the response returns. There is no score-without-save path, and an explainer failure falls back to `default_explanation` template text yet still persists, so a down LLM never fails a score.
- The drill score route is the deliberate inverse of the passage route. It reuses the same scorer and the same `ClipTooWeakError` 422 boundary, but requests the lower `MIN_WORD_CLIP_SECONDS` floor so a single spoken word is not rejected as too short, and writes no session. It takes both words of the pair and both contrast phonemes as form fields. First it calls `scorer.recognize_word`, a Whisper gate: when the clip is a clear third word, neither the target nor the competitor, it returns `said_expected_word=False` and skips scoring, since forcing the target phonemes onto an unrelated word would give a confident but meaningless verdict. Otherwise it calls `scorer.score_target_contrast`, which asks whether the competing phoneme scored higher than the target at the target's own frames rather than whether the target was acceptable on its own. The response is `said_expected_word` plus `phoneme_quality` and `flagged_phonemes`, where `flagged_phonemes` holds the target phoneme when it was substituted and is empty otherwise, so the frontend verdict logic is a plain membership check. An empty transcription falls through to scoring, so a too-short or silent clip still surfaces as the 422 rather than the not-recognized state. The route never calls the LLM explainer, since a drill needs the verdict but not the plain-language reason. A single-word rep stays out of session history and the weak-sound rollup, which is why the route carries no `get_session` or `get_explainer` dependency.
- `read_reference` caps `text` at 600 chars via query validation, strips whitespace, 422s on empty-after-strip, and returns raw `audio/wav` bytes with `Cache-Control: public, max-age=86400` rather than JSON.
- `GET /api/sessions/{session_id}` 404s with `detail='Session not found'`. A non-integer id is a FastAPI path-coercion 422, which the frontend route guard redirects on rather than surfacing.

## Gotchas

- The real scorer, explainer, and synth are imported inside their lifespan branches, so a missing optional extra raises a clear boot-time `RuntimeError` naming the `uv sync --extra` to run or the stub flag to set. Routes never import the heavy modules, which is what keeps CI green without the model stack.
- `minimal_pairs` is the one router with no session or model dependency. It reads a static in-memory dataset from `drills/`, so it needs neither the DB nor `app.state`.
