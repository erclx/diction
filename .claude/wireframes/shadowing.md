---
title: Shadowing
description: The shadowing surface where the user hears a native line, records an immediate repeat, and sees rhythm and intonation match scores
---

# Shadowing

The single-column shadowing surface. It shows one short line, plays the native rendering on demand, captures an immediate repeat, and returns a rhythm-match and an intonation-match score from `POST /api/prosody/score`. It is the prosody counterpart to passage scoring: instead of grading phonemes against a reference, it compares the user's timing and pitch shape against the native line they just heard.

Both scores read as directional, not as a settled grade. Shadowing is the first surface to show a prosody number, and prosody scoring is still on the same calibration footing the composite accentedness score carries. The caveat under the scores says so in plain words. See `.claude/context/scoring.md`.

## Idle

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Shadowing                        ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Shadowing                                    │ ← surface title
│  Play the native line, then record yourself   │
│  saying it right after.                       │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ The early bird catches the worm.      │    │ ← prompt line, dynamic
│  │ [ ✦ Generate a line ]                  │    │ ← generate a fresh line locally
│  │ [🗣] Hear the line, then shadow it     │    │ ← native reference of the whole line
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
│                 [ ▶ 0:00 ──────── 🔊 ]        │
│  ┌──────────────────┐  ┌──────────────────┐   │
│  │       88         │  │       84         │   │ ← rhythm and intonation match, neutral numbers
│  │  Rhythm match    │  │ Intonation match │   │
│  └──────────────────┘  └──────────────────┘   │
│   A directional read while prosody scoring    │ ← directional caveat, fine print
│   is still being calibrated, not a grade.     │
│      [ ↺ Record again ]   [ Next line → ]     │ ← re-record the same line or advance
└──────────────────────────────────────────────┘
```

## Copy

- Title: `Shadowing`
- Subtitle: `Play the native line, then record yourself saying it right after.`
- Prompt line: one short shadowing line, dynamic
- Reference caption: `Hear the line, then shadow it`
- Controls: `Generate a line`, `Record`, `Stop`, `Record again`, `Score`, `Next line`
- Match scores: `Rhythm match` and `Intonation match`, each a rounded number, shown as neutral numbers rather than colored score bands
- Directional caveat: `A directional read while prosody scoring is still being calibrated, not a settled grade.`, fine print
- Generic failure: `Scoring failed, check the backend is running and try again.`
- Generation failure: `Generation failed, try again or use the next line.`
- Mic denied: `Allow microphone access, then record.`

## Behavior

- One line shows at a time. The reference control plays the native rendering of that line, synthesized locally. Synthesis and caching live in `.claude/context/tts.md`.
- `Generate a line` requests a fresh line from `POST /api/content/generate` with `kind: shadowing` and seeds it in place of the cycled prompt, then the reference and scoring paths run on the generated line unchanged. The hardcoded lines stay the instant offline default, so a generation outage still leaves a usable line. The generation subsystem lives in `.claude/context/feedback.md`.
- The record control cycles idle to recording to recorded, the same capture path as passage scoring.
- Submitting sends the line text plus the clip to `POST /api/prosody/score`, which synthesizes the same reference internally and compares timing and pitch. The route writes no session, so a shadowing rep never lands in history or the weak-sound rollup in v1.
- Both scores show as neutral numbers with a directional caveat, never colored grade bands, because the prosody score is uncalibrated and read as directional until calibration lands.
- `Next line` advances to the next prompt and clears the recording, the scores, and any generation error, since the line it belonged to is gone. Changing the line also stops a reference clip still playing. `Record again` re-records the same line.
