---
title: Routine
description: The suggested-routine home that sequences practice modes into one ordered sitting, due sounds first
---

# Routine

The v0.6 practice home at `/routine`. It sequences the built practice modes into one short ordered sitting instead of leaving mode choice manual. It leads with the sounds that are due for review as minimal-pair drill steps, weaves the fixed-content modes between them for variety, and falls back to the weak-sound ranking or a fixed starter rotation when nothing is due. It suggests and links, it does not run a mode itself and it holds no completion state. Due sounds come from `GET /api/resurfacing`, weak sounds from `GET /api/weak-sounds`, and contrasts from `GET /api/minimal-pairs`, joined on the raw espeak phoneme all sides key on.

## Steps

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Routine                          ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Today's routine                              │ ← surface title
│  A short rotation for this sitting, due       │
│  sounds first.                                │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ ① 🗣 Production        Due for review │    │ ← step number, mode, reason
│  │ Focus on th vs f                     │    │ ← target contrast for a drill step
│  │ [ 🗣 Start ]                          │    │ ← routes into the mode, phoneme carried
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ ② 🎙 Passage        Read a full passage│   │ ← fixed-content interlude, no target
│  │ [ 🎙 Start ]                          │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ ③ 🦻 Ear training      Due for review │    │ ← next due sound, alternate drill mode
│  │ Focus on r vs l                      │    │
│  │ [ 🦻 Start ]                          │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

## Cold start

```plaintext
│  ┌──────────────────────────────────────┐    │
│  │ ① 🎙 Passage        Read a full passage│   │ ← fixed starter rotation, no signals yet
│  │ [ 🎙 Start ]                          │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ ② 🌊 Shadowing      Match a native rhythm│ │
│  │ [ 🌊 Start ]                          │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ ③ 〜 Stress        Trace stress and pitch│ │
│  │ [ 〜 Start ]                          │    │
│  └──────────────────────────────────────┘    │
```

## Copy

- Title: `Today's routine`
- Subtitle: `A short rotation for this sitting, due sounds first.`
- Step number: dynamic, the 1-based position in the sitting
- Mode heading: dynamic, the mode label such as `Production`, `Passage`, or `Shadowing`
- Step reason: dynamic, `Due for review` or `Weak sound` for a drill step, or the fixed-mode blurb `Read a full passage`, `Match a native rhythm`, `Trace stress and pitch`
- Focus line: dynamic, `Focus on <contrast or phoneme>`, shown only when the step targets a sound
- Step action: `Start`

## Behavior

- The surface loads due sounds, weak sounds, and contrasts on mount and plans the sitting client-side. It leads with the due sounds as alternating production and ear-training drill steps, interleaves the fixed-content modes so no two adjacent steps share a mode, and caps the sitting to a short list so it reads as one session rather than every due sound.
- When nothing is due it plans from the weak-sound ranking, and when there are no weak sounds either it shows a fixed starter rotation of passage, shadowing, and stress, so the surface is never blank.
- Each step routes into its mode. A drill step carries the phoneme so the target drill filters to that contrast, and a fixed-content step routes to its mode with no target. The planner and the mode registry live in `.claude/context/frontend.md`.
- A resurfacing load failure degrades to the weak-sound plan rather than blanking the surface, the same resilience the drill home follows. A weak-sound or contrast load failure shows a retry.
- The routine is a stateless suggestion recomputed on each visit. It tracks no completion and advances no progression, matching the recompute-on-read pattern the drill home uses.
