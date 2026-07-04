---
title: Progress dashboard
description: The progress surface where the user sees their score trend over time and their ranked weak sounds
---

# Progress dashboard

The progress surface at `/progress`. It reads two existing endpoints and renders no new capture path. `GET /api/sessions` feeds a score trend across past sessions, and `GET /api/weak-sounds` feeds a ranked list of recurring problem phonemes. Reached from the Progress nav in the app shell header. A single-column layout stacking a score-trend panel above a weak-sound panel, each in its own card.

## Populated

```plaintext
┌──────────────────────────────────────────────┐
│ Diction  Practice History Progress  ● Backend │ ← app shell header, Progress active
├──────────────────────────────────────────────┤
│  Progress                                     │ ← surface title
│  Track your score trend and the sounds that   │
│  need the most work.                          │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ Score trend                          │    │ ← panel title
│  │                                 ●     │    │
│  │           ●──────────────●╌╌╌╌╌       │    │ ← two lines over sessions, oldest left
│  │      ●╌╌╌╌                            │    │
│  │  ● Accuracy   ● Phoneme quality       │    │ ← legend, swatch per series
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ Weak sounds                          │    │ ← panel title
│  │ ┌──────────────────────────────────┐ │    │
│  │ │ θ                            5x  │ │    │ ← row: phoneme, occurrence count
│  │ │ thought, three, path             │ │    │   example words below
│  │ └──────────────────────────────────┘ │    │
│  │ ┌──────────────────────────────────┐ │    │
│  │ │ ɹ                            3x  │ │    │
│  │ │ red, around                      │ │    │
│  │ └──────────────────────────────────┘ │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

## Empty

```plaintext
│  ┌──────────────────────────────────────┐    │
│  │ Score trend                          │    │
│  │    No sessions yet. Score a passage   │    │ ← onboarding empty state
│  │    to start your trend.               │    │
│  │         [ Read a passage ]            │    │ ← next action, routes to Practice
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ Weak sounds                          │    │
│  │    No weak sounds yet. Score a        │    │
│  │    passage to start tracking them.    │    │
│  │         [ Read a passage ]            │    │
│  └──────────────────────────────────────┘    │
```

## Copy

- Title: `Progress`
- Subtitle: `Track your score trend and the sounds that need the most work.`
- Trend panel title: `Score trend`
- Trend legend: `Accuracy`, `Phoneme quality`
- Trend empty onboarding: `No sessions yet. Score a passage to start your trend.`
- Weak-sound panel title: `Weak sounds`
- Weak-sound row: phoneme, `{count}x`, and a comma-joined example-word line (dynamic)
- Weak-sound empty onboarding: `No weak sounds yet. Score a passage to start tracking them.`
- Empty action: `Read a passage`
- Trend load failure: `Could not load your trend, check the backend is running and try again.` with a `Retry` action
- Weak-sound load failure: `Could not load your weak sounds, check the backend is running and try again.` with a `Retry` action

## Behavior

- The trend plots accuracy and phoneme quality per session, ordered oldest to newest left to right, so the read moves forward in time. A single session shows one centered point per line rather than an empty chart.
- The weak-sound list renders in the order the API returns, ranked by frequency. It is not re-sorted on the client.
- Each panel owns its own loading, error, and empty state independently, so one failing read does not blank the other.
- Both empty states are the onboarding case, distinct from a filtered-empty case, and route the user to Practice. Each panel fails fast with a Retry.
- The surface is read-only. It adds no capture or mutation path, only renders session and weak-sound data already stored.
