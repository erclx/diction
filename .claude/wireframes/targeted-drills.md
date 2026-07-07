---
title: Targeted drills
description: The drill home that ranks the user's weak sounds and routes each into a minimal-pair drill that trains it
---

# Targeted drills

The v0.4 capstone surface and the drill home at `/drills`. It leads with the sounds that are due for review, falling back to the lifetime weak-sound ranking when nothing is due, and routes each entry into the ear-training or production drill for its contrast. It selects and links, it does not run a drill itself. Due sounds come from `GET /api/resurfacing`, weak sounds from `GET /api/weak-sounds`, and contrasts from `GET /api/minimal-pairs`, joined on the raw espeak phoneme all sides key on.

## Queue

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Targeted                         ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Targeted drills                              │ ← surface title
│  Review the sounds that are due, then the     │
│  ones you miss most.                          │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ th vs f                         Due  │    │ ← contrast label, due-for-review badge
│  │ Missed in thought, three, path       │    │ ← example words from the sound
│  │ [ 🦻 Ear training ] [ 🗣 Production ] │    │ ← route into either drill for this contrast
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ ɹ                                3x  │    │ ← weak-sound fallback, recurrence count
│  │ Missed in red, around                │    │
│  │ No drill for this sound yet.         │    │ ← plain note, not a dead link
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

## Empty state

```plaintext
│  ┌──────────────────────────────────────┐    │
│  │ No weak sounds yet. Score a passage   │    │
│  │ and your trouble sounds will show up  │    │
│  │ here to drill.                        │    │
│  │           [ Read a passage ]          │    │ ← onboarding route to the passage surface
│  └──────────────────────────────────────┘    │
```

## Copy

- Title: `Targeted drills`
- Subtitle: `Review the sounds that are due, then the ones you miss most.`
- Entry heading: dynamic, the contrast label such as `th vs f`, or the raw phoneme when no contrast matches
- Entry badge: dynamic, `Due` when the sound is due for review, or `<occurrences>x` in the weak-sound fallback
- Example line: dynamic, `Missed in <words>`
- Drill routes: `Ear training` and `Production`
- No-contrast note: `No drill for this sound yet. It will show up here once a matching pair is added.`
- Empty state: `No weak sounds yet. Score a passage and your trouble sounds will show up here to drill.` with `Read a passage`

## Behavior

- The surface loads due sounds, weak sounds, and contrasts on mount and joins them client-side. It leads with the sounds that are due for review, ordered most-overdue first, and only falls back to the weak-sound recurrence ranking when nothing is due. Either way it caps the queue to a short list so it reads as what to work on now, not a full inventory.
- Each entry with a matching contrast routes into the ear-training and production drills, carrying the phoneme so the target drill filters to that contrast. The join and routing live in `.claude/context/frontend.md`.
- A weak sound with no matching contrast shows a plain note in place of the drill links, so the entry never becomes a dead end.
- No weak sounds yet shows the onboarding card routing to the passage surface, distinct from the no-contrast note that a single entry shows.
- A failed load shows a retry, the same pattern the progress dashboard uses.
