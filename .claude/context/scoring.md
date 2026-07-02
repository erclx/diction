---
title: Scoring
description: GOP pronunciation-scoring pipeline, its models, alignment, and the passage-score contract
---

# Scoring

The pronunciation-scoring pipeline behind `POST /api/passages/score`. It turns a recorded passage into four scores and a flagged-word list, following the record-then-analyze pattern in `.claude/ARCHITECTURE.md`.

## Layer responsibilities

- `scoring/types.py` owns the internal `ScoreResult` and `FlaggedWordResult`.
- `scoring/gop.py` owns the model-free GOP aggregation, normalization, and thresholds.
- `scoring/audio.py` owns ffmpeg decoding to 16 kHz mono and the too-weak check.
- `scoring/scorer_gop.py` owns the real `GopScorer`: Whisper timings, wav2vec2 posteriors, and CTC forced alignment.
- `scoring/base.py` owns the `PassageScorer` protocol and the `StubScorer`.
- `api/passages.py` owns the HTTP route and the response models.

## Decisions

- The scorer is chosen once in the lifespan from `Settings.use_stub_scorer` and held on `app.state.scorer`, injected through `get_scorer`. The optional-dependency and stub rationale lives in `.claude/ARCHITECTURE.md`.
- GOP math sits in a model-free module so it unit-tests without torch, a GPU, or a model download.
- The score route is `def`, not `async def`, so blocking inference runs in the FastAPI threadpool.
- Flagged-word explanation text is a placeholder template. LLM-generated feedback arrives in v0.2.
- Runtime conventions are enforced by `.claude/rules/lib/360-model-runtime.md`.

## Hidden contracts

- `aggregate_scores` raises `ClipTooWeakError` on an empty alignment rather than returning zeros, so unscorable input never reads as a perfect score.
- The flagged-word shape (`word`, `start`, `end`, `phoneme`) maps one-to-one onto `FlaggedWord`, persisted with `mode='passage'`.
- `ClipTooWeakError` maps to `422 {"error": "clip_too_weak"}` through an app exception handler, distinct from a low score.

## Gotchas

- The phonemizer needs a phone `Separator`. Without it every phoneme drops as unknown and the score reads as a false pass. The spike hit exactly this.
- `normalize_gop`, `fluency`, and `GOP_FLAG_THRESHOLD` are spike placeholders. Recalibrate against real clips before the numbers are treated as final.
- Vowel-length errors (ɪ versus iː) under-detect. Validate before building the minimal-pair features.
- torchaudio 2.11 routes `load()` through torchcodec, which is not installed. Audio is read via ffmpeg into a stdlib `array` instead.
