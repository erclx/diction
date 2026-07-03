---
title: Passage scoring
description: The passage reading surface where the user records a read-aloud and sees pronunciation scores
---

# Passage scoring

The single-column practice surface for the passage reading feature. It shows a passage, captures a microphone recording, and renders the four scores plus flagged words returned by `POST /api/passages/score`.

## Idle

```plaintext
┌──────────────────────────────────────────────┐
│ Diction   Practice History        ● Backend   │ ← app shell header, Practice active
├──────────────────────────────────────────────┤
│  Passage reading                              │ ← surface title
│  Read the passage aloud, then score your      │
│  pronunciation.                               │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ Read this aloud                       │    │ ← passage card
│  │ The quick brown fox jumps over the... │    │
│  └──────────────────────────────────────┘    │
│                                               │
│                 [ 🎤 Record ]                 │ ← record control
└──────────────────────────────────────────────┘
```

## Recorded

```plaintext
│                 [ ▶ 0:00 ──────── 🔊 ]        │ ← playback of own clip
│         [ ↺ Record again ]  [ Score ]         │ ← re-record or submit
```

## Scored

```plaintext
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ ← four score metrics
│  │   90.9   │ │   92.2   │ │   98.0   │ │   94.0   │ │   colored by band
│  │ Complete │ │ Accuracy │ │ Fluency  │ │ Phoneme  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                               │
│  Flagged words                                │
│  ┌──────────────────────────────────────┐    │
│  │ [🔊] thought  (θ)                     │    │ ← play span, phoneme chip
│  │      The "th" came out as "t"...      │    │ ← plain-language reason
│  └──────────────────────────────────────┘    │
```

## Empty flagged words

```plaintext
│  Flagged words                                │
│  No mispronounced words. Read another         │
│  passage to keep practicing.                  │
```

## Copy

- Title: `Passage reading`
- Subtitle: `Read the passage aloud, then score your pronunciation.`
- Passage card heading: `Read this aloud`
- Controls: `Record`, `Stop`, `Record again`, `Score`
- Metric labels: `Completeness`, `Accuracy`, `Fluency`, `Phoneme quality`
- Clip too weak: `Recording was too short or quiet, record again and speak clearly.`
- Generic failure: `Scoring failed, check the backend is running and try again.`
- Empty flagged list: `No mispronounced words. Read another passage to keep practicing.`

## Behavior

- The control cycles idle to recording to recorded. Recording captures the full clip, no streaming.
- From the recorded state the user can play their own clip, re-record, or submit for scoring.
- Submitting disables the control and shows a spinner until the score set or an error returns.
- A too-weak clip shows a re-record prompt distinct from a generic failure, matching the 422 boundary.
- Each metric is colored by band: green at 90 and above, amber at 75 to 89, red below 75.
- Each flagged word plays its own recorded span. Score band coloring and span playback mechanics live in `.claude/context/frontend.md`.
