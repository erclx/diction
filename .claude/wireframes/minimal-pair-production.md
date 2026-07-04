---
title: Minimal pair production
description: The production drill surface where the user says one word of a minimal pair and gets pass-or-retry feedback on the target sound
---

# Minimal pair production

The single-column drill surface for minimal pair production. It shows one word pair, prompts the user to say the highlighted target, captures a recording, and returns a binary pass-or-retry verdict from `POST /api/drills/minimal-pair/score`. It is the speak-and-check counterpart to ear-training.

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

## Pass

```plaintext
│                 [ ▶ 0:00 ──────── 🔊 ]        │
│  ┌──────────────────────────────────────┐    │
│  │        Nice, "walk" landed.           │    │ ← success banner, dynamic
│  └──────────────────────────────────────┘    │
│                [ Next word → ]                │ ← advance to the next rep
```

## Retry

```plaintext
│                 [ ▶ 0:00 ──────── 🔊 ]        │
│  ┌──────────────────────────────────────┐    │
│  │    Not quite, try "walk" again.       │    │ ← retry banner, dynamic
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
- Pass banner: `Nice, "<target>" landed.`, dynamic
- Retry banner: `Not quite, try "<target>" again.`, dynamic
- Clip too weak: `Recording was too short or quiet, record again and speak clearly.`
- Generic failure: `Scoring failed, check the backend is running and try again.`
- Empty dataset: `No minimal-pair drills are available yet.`

## Behavior

- One rep shows a pair and asks for the highlighted target word. The record control cycles idle to recording to recorded, the same capture path as passage scoring.
- Submitting scores the single target word through `POST /api/drills/minimal-pair/score`. The route runs the scorer but writes no session, so a drill rep never lands in history or the weak-sound rollup.
- The verdict is binary and keyed to the contrast's target phoneme. A flag on the target sound is a retry, a clip with the target sound clean is a pass even if another phoneme flags, since the drill trains one contrast. Both states advance to the next rep, and retry also offers an immediate re-record of the same word.
- Each rep drills the `word_a` side of a pair, which carries the harder target phoneme. The `word_b` side sets the contrast on screen but is not itself scored in v1.
- A too-weak clip shows a re-record prompt distinct from a generic failure, matching the 422 boundary, so a short clip never reads as a false pass.
- Reference playback speaks the target word, synthesized locally. Synthesis and caching live in `.claude/context/tts.md`.
