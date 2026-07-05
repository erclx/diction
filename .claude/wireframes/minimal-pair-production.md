---
title: Minimal pair production
description: The production drill surface where the user says one word of a minimal pair and sees a sound-quality score for the target
---

# Minimal pair production

The single-column drill surface for minimal pair production. It shows one word pair, prompts the user to say the highlighted target, captures a recording, and returns a continuous sound-quality score from `POST /api/drills/minimal-pair/score`. It is the speak-and-check counterpart to ear-training.

The surface shows a directional score rather than a binary pass-or-retry verdict, because the phoneme flag threshold is an uncalibrated placeholder that misfires on vowel contrasts. A number the user compares across attempts avoids asserting a pass or fail the scorer cannot yet defend. The binary verdict returns once the thresholds are calibrated against real recordings. See `.claude/plans/feature-score-calibration.md`.

## Idle

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Production                       ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Minimal pair production                      │ ← surface title
│  Say the highlighted word, then check the     │
│  target sound landed.                         │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ walk vs wok                           │    │ ← contrast label, dynamic
│  │ walk / wok                            │    │ ← target highlighted, other muted
│  │ [🗣] Say "walk"                       │    │ ← native reference of the target word
│  └──────────────────────────────────────┘    │
│                                               │
│                 [ 🎤 Record ]                 │ ← record control
└──────────────────────────────────────────────┘
```

## Recorded

```plaintext
│                 [ ▶ 0:00 ──────── 🔊 ]        │ ← playback of own clip
│         [ ↺ Record again ]  [ Check ]         │ ← re-record or submit
```

## Scored

```plaintext
│                 [ ▶ 0:00 ──────── 🔊 ]        │
│  ┌──────────────────────────────────────┐    │
│  │                  72                   │    │ ← score, dynamic, neutral styling
│  │   Sound quality for "walk", higher    │    │ ← caption, dynamic target word
│  │              is cleaner               │    │
│  └──────────────────────────────────────┘    │
│      [ ↺ Try again ]   [ Next word → ]        │ ← re-record the same word or advance
```

## Copy

- Title: `Minimal pair production`
- Subtitle: `Say the highlighted word, then check the target sound landed.`
- Card heading: the contrast label, dynamic, `walk vs wok` shown
- Pair line: target word highlighted and the other muted, dynamic
- Prompt caption: `Say "<target>"`, dynamic
- Controls: `Record`, `Stop`, `Record again`, `Check`, `Try again`, `Next word`
- Score: the rounded `phoneme_quality` number, dynamic
- Score caption: `Sound quality for "<target>", higher is cleaner`, dynamic
- Clip too weak: `Recording was too short or quiet, record again and speak clearly.`
- Generic failure: `Scoring failed, check the backend is running and try again.`
- Empty dataset: `No minimal-pair drills are available yet.`

## Behavior

- One rep shows a pair and asks for the highlighted target word. The record control cycles idle to recording to recorded, the same capture path as passage scoring.
- Submitting scores the single target word through `POST /api/drills/minimal-pair/score`. The route runs the scorer but writes no session, so a drill rep never lands in history or the weak-sound rollup.
- The result is a single sound-quality number for the target word, shown in neutral styling with no pass-or-fail color. Higher is cleaner. The score is directional, meant to be compared across the user's own attempts, not read against a fixed threshold. From here the user can re-record the same word or advance to the next rep.
- Each rep drills the `word_a` side of a pair, which carries the harder target phoneme. The `word_b` side sets the contrast on screen but is not itself scored in v1.
- A too-weak clip shows a re-record prompt distinct from a generic failure, matching the 422 boundary, so a short clip never reads as a false pass.
- Reference playback speaks the target word, synthesized locally. Synthesis and caching live in `.claude/context/tts.md`.
