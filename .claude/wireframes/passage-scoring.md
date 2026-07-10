---
title: Passage scoring
description: The passage reading surface where the user records a read-aloud and sees pronunciation scores
---

# Passage scoring

The single-column practice surface for the passage reading feature. It shows a passage, captures a microphone recording, and renders the four scores plus flagged words returned by `POST /api/passages/score`.

## Idle

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Practice                         ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Passage reading                              │ ← surface title
│  Read the passage aloud, then score your      │
│  pronunciation.                               │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ Read this aloud                       │    │ ← passage card
│  │ The quick brown fox jumps over the... │    │
│  │ [🗣] Hear it read aloud               │    │ ← native reference playback
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

## Scoring

```plaintext
│         [ ↺ Record again ]  [ ⟳ Score ]       │ ← Score spins, both disabled
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ ← metric-card skeletons
│  │ ▏▏▏▏▏▏▏▏ │ │ ▏▏▏▏▏▏▏▏ │ │ ▏▏▏▏▏▏▏▏ │ │ ▏▏▏▏▏▏▏▏ │ │   pulsing placeholders
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  Flagged words                                │
│  ┌──────────────────────────────────────┐    │ ← flagged-row skeletons
│  │ [▮][▮] ▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏  │    │
│  └──────────────────────────────────────┘    │
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
│  │ [🔊][🗣] thought  (θ)                 │    │ ← own span, native reference, phoneme chip
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
- Reference caption: `Hear it read aloud`
- Controls: `Record`, `Stop`, `Record again`, `Score`
- Metric labels: `Completeness`, `Accuracy`, `Fluency`, `Phoneme quality`
- Clip too weak: `Recording was too short or quiet, record again and speak clearly.`
- Generic failure: `Scoring failed, check the backend is running and try again.`
- Empty flagged list: `No mispronounced words. Read another passage to keep practicing.`

## Behavior

- The control cycles idle to recording to recorded. Recording captures the full clip, no streaming.
- From the recorded state the user can play their own clip, re-record, or submit for scoring.
- Submitting disables the control, spins the Score button, and fills the result region with a skeleton of the score cards and flagged-word rows until the score set or an error returns, so the wait reads as active rather than blank. The free-topic surface shows the same skeleton while its clip scores.
- A too-weak clip shows a re-record prompt distinct from a generic failure, matching the 422 boundary.
- Each metric is colored by band: green at 90 and above, amber at 75 to 89, red below 75.
- Each flagged word plays its own recorded span. Score band coloring and span playback mechanics live in `.claude/context/frontend.md`.
- The passage card and each flagged word also play a native reference, synthesized locally and distinct from the user's own recording. The flagged-word row shows both controls side by side, the speaker for the user's clip and the reference for the native one. Reference synthesis and caching live in `.claude/context/tts.md`.
