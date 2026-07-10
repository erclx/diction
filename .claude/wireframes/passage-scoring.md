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
│  │ ┌──────────────────────────────────┐  │    │ ← editable passage textarea
│  │ │ The quick brown fox jumps over...│  │    │
│  │ └──────────────────────────────────┘  │    │
│  │ Edit the passage or type your own.    │    │ ← helper, or an inline error
│  │ [✨ Generate a passage] ☐ Focus on    │    │ ← generate control, weak-sound toggle
│  │    my weak sounds                     │    │
│  │ [🗣] Hear it read aloud               │    │ ← native reference playback
│  └──────────────────────────────────────┘    │
│                                               │
│                 [ 🎤 Record ]                 │ ← record control, disabled on invalid text
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
- Passage helper: `Edit the passage or type your own, then read it aloud.`
- Passage empty error: `Enter some text to practice`
- Generate control: `Generate a passage`
- Weak-sound toggle: `Focus on my weak sounds`
- Generation failure: `Generation failed, try again or type your own passage.`
- Reference caption: `Hear it read aloud`
- Controls: `Record`, `Stop`, `Record again`, `Score`
- Metric labels: `Completeness`, `Accuracy`, `Fluency`, `Phoneme quality`
- Clip too weak: `Recording was too short or quiet, record again and speak clearly.`
- Generic failure: `Scoring failed, check the backend is running and try again.`
- Empty flagged list: `No mispronounced words. Read another passage to keep practicing.`

## Behavior

- While idle the passage is an editable field seeded with a default passage. The user can edit it or type their own, and passage scoring aligns against whatever text is shown, so a typed passage scores against itself. The text is trimmed and validated at the input boundary, and empty or over-length text disables the reference and record controls with an inline error, stopping any reference clip that was playing. Once recording starts the passage locks to static text and the generate control hides.
- Generate a passage asks the local LLM for a fresh passage and seeds the returned text into the same editable field, where it validates and scores like typed text. The weak-sound toggle biases generation toward the user's tracked problem sounds when on, and a general passage when off. A generation failure shows an inline error and leaves the current text in place, so the surface never blanks. Generation source and the weak-sound wiring live in `.claude/context/frontend.md`.
- The control cycles idle to recording to recorded. Recording captures the full clip, no streaming.
- From the recorded state the user can play their own clip, re-record, or submit for scoring.
- Submitting disables the control, spins the Score button, and fills the result region with a skeleton of the score cards and flagged-word rows until the score set or an error returns, so the wait reads as active rather than blank. The free-topic surface shows the same skeleton while its clip scores.
- A too-weak clip shows a re-record prompt distinct from a generic failure, matching the 422 boundary.
- Each metric is colored by band: green at 90 and above, amber at 75 to 89, red below 75.
- Each flagged word plays its own recorded span. Score band coloring and span playback mechanics live in `.claude/context/frontend.md`.
- The passage card and each flagged word also play a native reference, synthesized locally and distinct from the user's own recording. The flagged-word row shows both controls side by side, the speaker for the user's clip and the reference for the native one. Reference synthesis and caching live in `.claude/context/tts.md`.
- The reference control toggles play and stop: it shows a stop glyph while its clip plays, and a click halts the clip rather than restarting it. Starting a recording stops any reference or own-clip playback first, so the mic never records over it.
