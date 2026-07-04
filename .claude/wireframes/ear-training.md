---
title: Ear training
description: The ear-training drill where the user hears one word from a minimal pair and picks which one was said
---

# Ear training

The recognition drill that precedes production practice. It plays one word from a minimal pair, presents both words as choices, and gives immediate right-or-wrong feedback with a running within-session score. No microphone and no scoring model. Contrasts come from `GET /api/minimal-pairs` and words play through `GET /api/reference`, the same native-reference path the passage surface uses.

## Start

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Ear training                     ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Ear training                                 │ ← surface title
│  Hear one word from a pair and pick which     │
│  one was said.                                │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ Ready to train your ear               │    │
│  │ You will hear one word from a pair.   │    │
│  │ Pick the one you heard.               │    │
│  │              [ Start ]                │    │ ← gates first playback behind a gesture
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

## Drill

```plaintext
│                             0 of 0 correct    │ ← running within-session score
│  ┌──────────────────────────────────────┐    │
│  │ th vs f                               │    │ ← contrast label
│  │        Which word did you hear?       │    │
│  │            [ 🗣 Play again ]          │    │ ← replay the current word
│  │  ┌───────────────┐ ┌───────────────┐  │    │
│  │  │     thin      │ │     fin       │  │    │ ← the two choices
│  │  └───────────────┘ └───────────────┘  │    │
│  └──────────────────────────────────────┘    │
```

## Answered

```plaintext
│  │  ┌───────────────┐ ┌───────────────┐  │    │
│  │  │    thin  ✓    │ │     fin       │  │    │ ← correct choice greens, a wrong pick reds
│  │  └───────────────┘ └───────────────┘  │    │
│  │           ✓ Correct  /  ✗ It was thin │    │ ← result line
│  │              [ Next ]                 │    │ ← advance to a fresh round
│  └──────────────────────────────────────┘    │
```

## Empty state

```plaintext
│  ┌──────────────────────────────────────┐    │
│  │ No drill pairs are available yet.     │    │
│  │        [ Back to practice ]           │    │ ← escape to the passage surface
│  └──────────────────────────────────────┘    │
```

## Copy

- Title: `Ear training`
- Subtitle: `Hear one word from a pair and pick which one was said.`
- Start card heading: `Ready to train your ear`
- Start card body: `You will hear one word from a pair. Pick the one you heard.`
- Start control: `Start`
- Contrast label: dynamic, the pair's plain-language name such as `th vs f`
- Drill prompt: `Which word did you hear?`
- Replay control: `Play again`
- Score: dynamic, `<correct> of <attempted> correct`
- Correct result: `Correct`
- Wrong result: dynamic, `It was <word>`
- Advance control: `Next`
- Empty state: `No drill pairs are available yet.` with `Back to practice`

## Behavior

- The surface loads contrasts on mount. An empty set shows the empty card with a link back to the passage surface rather than a broken drill.
- Each round picks a contrast, a random pair, and a random side, then plays that word. First playback waits for the `Start` gesture, since browsers block autoplay without one.
- The current word plays when a round starts and replays on demand through `Play again`. Reference synthesis and caching live in `.claude/context/tts.md`.
- Choosing reveals the outcome. The correct word turns success-colored, a wrong pick turns destructive-colored, and a result line names the word. The choices lock until `Next`.
- The score counts correct out of attempted and lives in component state only. Cross-session ear-training progress is a follow-up, not this cut.
- `Next` advances to a freshly picked round and clears the reveal.
