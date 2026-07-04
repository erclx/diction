---
title: Targeted drills
description: The drill home that ranks the user's weak sounds and routes each into a minimal-pair drill that trains it
---

# Targeted drills

The v0.4 capstone surface and the drill home at `/drills`. It joins the user's weak sounds against the available minimal-pair contrasts, ranks them by how often each sound recurs, and routes each entry into the ear-training or production drill for that contrast. It selects and links, it does not run a drill itself. Weak sounds come from `GET /api/weak-sounds` and contrasts from `GET /api/minimal-pairs`, joined on the raw espeak phoneme both sides key on.

## Queue

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Targeted                         ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Targeted drills                              │ ← surface title
│  Practice the sounds you miss most, ranked    │
│  by how often they trip you up.               │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ th vs f                          5x  │    │ ← contrast label, recurrence count
│  │ Missed in thought, three, path       │    │ ← example words from the weak sound
│  │ [ 🦻 Ear training ] [ 🗣 Production ] │    │ ← route into either drill for this contrast
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ ɹ                                3x  │    │ ← a weak sound with no matching contrast
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
- Subtitle: `Practice the sounds you miss most, ranked by how often they trip you up.`
- Entry heading: dynamic, the contrast label such as `th vs f`, or the raw phoneme when no contrast matches
- Recurrence count: dynamic, `<occurrences>x`
- Example line: dynamic, `Missed in <words>`
- Drill routes: `Ear training` and `Production`
- No-contrast note: `No drill for this sound yet. It will show up here once a matching pair is added.`
- Empty state: `No weak sounds yet. Score a passage and your trouble sounds will show up here to drill.` with `Read a passage`

## Behavior

- The surface loads weak sounds and contrasts on mount and joins them client-side. It ranks entries by recurrence, highest first, and caps the queue to a short list so it reads as what to work on now, not a full inventory.
- Each entry with a matching contrast routes into the ear-training and production drills, carrying the phoneme so the target drill filters to that contrast. The join and routing live in `.claude/context/frontend.md`.
- A weak sound with no matching contrast shows a plain note in place of the drill links, so the entry never becomes a dead end.
- No weak sounds yet shows the onboarding card routing to the passage surface, distinct from the no-contrast note that a single entry shows.
- A failed load shows a retry, the same pattern the progress dashboard uses.
