---
title: Minimal pair production
description: The production drill surface where the user says one word of a minimal pair and sees a pass or retry verdict for the target sound
---

# Minimal pair production

The single-column drill surface for minimal pair production. It shows one word pair, prompts the user to say the highlighted target, captures a recording, and returns a pass or retry verdict from `POST /api/drills/minimal-pair/score`. It is the speak-and-check counterpart to ear-training.

The verdict compares the two sounds of the pair. A pass means the target sound scored higher than the competing one, a retry means the competitor won, so the user produced the wrong sound of the contrast. Judging the target against its competitor, rather than against an absolute bar, is what makes the verdict hold on close pairs like `th` versus `f`. See `.claude/context/scoring.md`. The rounded `phoneme_quality` number rides along as a secondary line so the user can track progress across their own attempts, which the binary alone cannot show.

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
│  │          Nice, "walk" landed.         │    │ ← pass verdict, success styling, dynamic target
│  └──────────────────────────────────────┘    │
│      Sound quality 82, compare across         │ ← progress number, secondary fine print
│            your own tries                     │
│              [ Next word → ]                  │ ← advance to the next rep
```

## Retry

```plaintext
│                 [ ▶ 0:00 ──────── 🔊 ]        │
│  ┌──────────────────────────────────────┐    │
│  │   Closer to "wok", try "walk" again.  │    │ ← retry verdict, names the competing word, warning styling
│  └──────────────────────────────────────┘    │
│      Sound quality 41, compare across         │ ← progress number, secondary fine print
│            your own tries                     │
│      [ ↺ Try again ]   [ Next word → ]        │ ← re-record the same word or advance
```

## Copy

- Title: `Minimal pair production`
- Subtitle: `Say the highlighted word, then check the target sound landed.`
- Card heading: the contrast label, dynamic, `walk vs wok` shown
- Pair line: target word highlighted and the other muted, dynamic
- Prompt caption: `Say "<target>"`, dynamic
- Controls: `Record`, `Stop`, `Record again`, `Check`, `Try again`, `Next word`
- Pass verdict: `Nice, "<target>" landed.`, dynamic target word
- Retry verdict: `Closer to "<other>", try "<target>" again.`, dynamic target and competing word
- Progress number: `Sound quality <phoneme_quality>, compare across your own tries`, dynamic, fine print
- Clip too weak: `Recording was too short or quiet, record again and speak clearly.`
- Generic failure: `Scoring failed, check the backend is running and try again.`
- Empty dataset: `No minimal-pair drills are available yet.`

## Behavior

- One rep shows a pair and asks for the highlighted target word. The record control cycles idle to recording to recorded, the same capture path as passage scoring.
- Submitting scores the single target word through `POST /api/drills/minimal-pair/score`. The route runs the scorer but writes no session, so a drill rep never lands in history or the weak-sound rollup.
- Submitting sends the target word and both contrast phonemes. The verdict is retry when the competing sound scored higher than the target at the target's own moment, pass otherwise. A pass offers only advance to the next rep, a retry offers re-record or advance. The rounded `phoneme_quality` number shows below the verdict as a secondary progress line, compared across the user's own attempts rather than against a fixed threshold.
- Each rep drills the `word_a` side of a pair, which carries the harder target phoneme. The `word_b` side sets the contrast on screen but is not itself scored in v1.
- A too-weak clip shows a re-record prompt distinct from a generic failure, matching the 422 boundary, so a short clip never reads as a false pass.
- Reference playback speaks the target word, synthesized locally. Synthesis and caching live in `.claude/context/tts.md`.
