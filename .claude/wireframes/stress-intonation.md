---
title: Stress and intonation
description: The stress-and-intonation drill where the user reads a line, then sees its stressed syllables and pitch shape drawn against their own
---

# Stress and intonation

The single-column stress-and-intonation surface. It shows one line, plays the native rendering on demand, captures a read of it, and returns the reference and learner pitch contours, the reference's stressed syllables, and a rhythm-match and intonation-match score from `POST /api/prosody/analyze`. Where Shadowing reduces prosody to two numbers, this surface draws the reference's pitch shape and marks its stressed syllables, so the user sees where their delivery diverged rather than only that it did.

The v1 shows expected stress on the reference only, derived from the espeak phonemization the scorer already runs. Detecting whether the user stressed the right syllable is the follow-up. See `.claude/context/scoring.md`.

Both scores and the drawn contour read as directional, not as a settled grade. Prosody scoring is on the same calibration footing the composite accentedness score carries, and the contour is the deferred real-recording validation made visible. The caveat under the scores says so in plain words.

## Idle

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Stress                           ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Stress and intonation                        │ ← surface title
│  Read the line, then see its stressed         │
│  syllables and pitch shape against your own.  │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ I never said she stole the money.     │    │ ← prompt line, dynamic
│  │ [ ✦ Generate a line ]                  │    │ ← generate a fresh line locally
│  │ [🗣] Hear the line, then read it back  │    │ ← native reference of the whole line
│  └──────────────────────────────────────┘    │
│                                               │
│                 [ 🎤 Record ]                 │ ← record control
└──────────────────────────────────────────────┘
```

## Recorded

```plaintext
│                 [ ▶ 0:00 ──────── 🔊 ]        │ ← playback of own clip
│        [ ↺ Record again ]  [ Analyze ]        │ ← re-record or submit
```

## Analyzed

```plaintext
│  ┌──────────────────────────────────────┐    │
│  │        ╭─╮  ┊         ┊                │    │ ← reference pitch contour, solid
│  │   ╭────╯ ╰──╮      ╭╌╌╮               │    │
│  │ ╭╌╯      ┊  ╰╌╌╮ ╭╌╯ ┊╰╌╮             │    │ ← learner contour, dashed overlay
│  │  ─ Reference   ╌ You  ┊ ← word bounds │    │ ← contour legend and per-word gridlines
│  │  [ðə] [bə ˈnɑː nə] ...                 │    │ ← syllables, stressed one highlighted
│  └──────────────────────────────────────┘    │
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

- Title: `Stress and intonation`
- Subtitle: `Read the line, then see its stressed syllables and pitch shape against your own.`
- Prompt line: one short line, dynamic
- Reference caption: `Hear the line, then read it back`
- Contour legend: `Reference` and `You`
- Syllables: the reference word's espeak syllables, the stressed one highlighted, dynamic
- Controls: `Generate a line`, `Record`, `Stop`, `Record again`, `Analyze`, `Next line`
- Match scores: `Rhythm match` and `Intonation match`, each a rounded number, shown as neutral numbers rather than colored score bands
- Directional caveat: `A directional read while prosody scoring is still being calibrated, not a settled grade.`, fine print
- Generic failure: `Analysis failed, check the backend is running and try again.`
- Generation failure: `Generation failed, try again or use the next line.`
- Mic denied: `Allow microphone access, then record.`

## Behavior

- One line shows at a time. The reference control plays the native rendering of that line, synthesized locally. Synthesis and caching live in `.claude/context/tts.md`.
- `Generate a line` requests a fresh line from `POST /api/content/generate` with `kind: stress` and seeds it in place of the cycled prompt, then the reference and analysis paths run on the generated line unchanged. The hardcoded lines stay the instant offline default, so a generation outage still leaves a usable line. The generation subsystem lives in `.claude/context/feedback.md`.
- The record control cycles idle to recording to recorded, the same capture path as passage scoring.
- Submitting sends the line text plus the clip to `POST /api/prosody/analyze`, which synthesizes the same reference internally, draws both pitch contours, and marks the reference's stressed syllables. The route writes no session, so a rep never lands in history or the weak-sound rollup in v1.
- The reference contour draws solid and the learner contour dashes over it on the same pitch scale, so the shapes compare directly rather than by absolute pitch. Both contours sit on a shared linguistic timeline, evenly split by faint per-word gridlines, so the same horizontal position is the same point in the sentence for both readers regardless of tempo. Both scores show as neutral numbers with a directional caveat, never colored grade bands, because the prosody score and the contour are uncalibrated and read as directional until calibration and the real-recording validation land.
- `Next line` advances to the next prompt and clears the recording and results. `Record again` re-records the same line.
