---
title: Drills
description: Curated minimal-pair drill content keyed by phoneme contrast, and its read-only lookup API
---

# Drills

The shared v0.4 foundation. Minimal pair production, ear-training, and the targeted-drill selector all read the same content: given a phoneme, the word pairs that train it. The targeted-drill home joins this dataset against `GET /api/weak-sounds` client-side to rank what to practice, so the phoneme keys here must match what the weak-sound tracker stores. That join lives in `.claude/context/frontend.md`.

## Layer responsibilities

- `drills/minimal_pairs_data.py` owns the curated dataset as a module-level constant and its internal frozen dataclasses (`WordPair`, `MinimalPairContrast`).
- `api/minimal_pairs.py` owns the `GET /api/minimal-pairs` route, its separate pydantic response models, and the optional `?phoneme=` filter.

## Decisions

- Content is static and in-memory. No database and no capture path, unlike the passage and session domains. A curated constant, not generated.
- The API layer defines its own pydantic response models over the internal dataclasses rather than serializing the constant directly, matching the boundary pattern the other routes follow.

## Hidden contracts

- Every phoneme key is a raw espeak IPA token the scorer emits. The single source of truth is `phonemize(..., separator=Separator(phone=' '))` in `scoring/scorer_gop.py`, the same call the weak-sound tracker stores against. A key that drifts to a prettified or wrong label makes `?phoneme=<weak>` return nothing, so the drill silently trains no one.
- `label` carries the plain-language contrast name for UI. The phoneme fields stay raw. Do not prettify in the data.
- The filter matches a query against either `phoneme_a` or `phoneme_b`, so a weak sound maps to every contrast that trains it. An unknown phoneme returns `[]` with a 200, never an error.

## Gotchas

- `iː` is the only composite key. Every other key is a single atomic phone, immune to the phone-separator segmentation question. Verified against the real espeak-ng backend that long-ee words (`sheep`, `beat`, `seat`, `leave`) phonemize to `iː` as one token, not `i` + `ː`, so `?phoneme=iː` matches what the scorer stores. Re-run that check before adding any future key that carries a length mark or diacritic.
