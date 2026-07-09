---
title: Free topic
description: The free-topic surface where the user speaks on a prompt for a minute or two and sees pronunciation scores alongside a grammar and phrasing critique
---

# Free topic

The single-column free-topic surface. It shows one speaking prompt, captures a one-to-two-minute monologue, and returns two stacked feedback sections from `POST /api/free-topic/score`: pronunciation first, then a grammar and phrasing critique. It is the only practice mode with no fixed reference text. The clip is transcribed, scored against its own transcript, and the transcript is critiqued by a local LLM, so both outputs are bounded by what recognition heard.

Everything reads as directional. Scores are relative to the recognized words rather than a target script, and recognition tidies disfluent speech before either the flag or the critique sees it. The caveat above the scores and the "What we heard" transcript below make that visible. See `.claude/context/feedback.md` and `.claude/context/scoring.md`.

## Idle

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Free topic                       ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Free topic                                   │ ← surface title
│  Speak on the topic for a minute or two, then │
│  get pronunciation and language feedback.     │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ Speak about this                      │    │
│  │ Describe a place you have traveled to │    │ ← topic prompt, dynamic, never scored
│  │ and what made it memorable.           │    │
│  │ Aim for one to two minutes.           │    │
│  └──────────────────────────────────────┘    │
│                                               │
│                 [ 🎤 Record ]                 │ ← record control
└──────────────────────────────────────────────┘
```

## Recorded

```plaintext
│                 [ ▶ 0:00 ──────── 🔊 ]        │ ← playback of own clip
│        [ ↺ Record again ]   [ Score ]         │ ← re-record or submit
```

## Scored

```plaintext
│  Pronunciation                                │ ← section one, the tool's core
│  Scored against the words we recognized, a    │ ← directional caveat, fine print
│  directional guide, not a fixed script.       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │100 │ │ 91 │ │ 84 │ │ 88 │                  │ ← completeness, accuracy, fluency, phoneme
│  └────┘ └────┘ └────┘ └────┘                  │
│  Flagged words                                │
│  [🔊][🗣] drives  /v/  The /v/ scored low.    │ ← own-clip span, native reference, reason
│                                               │
│  Grammar and phrasing                         │ ← section two, the language critique
│  ┌──────────────────────────────────────┐    │
│  │ Use past tense: "we drove", not       │    │ ← up to three terse structured points
│  │ "we drives".                          │    │
│  └──────────────────────────────────────┘    │
│                                               │
│  What we heard                                │ ← recognized transcript, grounds the caveat
│  ┌──────────────────────────────────────┐    │
│  │ we drives to the park before it start │    │
│  └──────────────────────────────────────┘    │
│      [ ↺ Record again ]   [ Next topic → ]    │ ← re-record or advance
└──────────────────────────────────────────────┘
```

## Copy

- Title: `Free topic`
- Subtitle: `Speak on the topic for a minute or two, then get pronunciation and language feedback.`
- Prompt card title: `Speak about this`
- Prompt line: one speaking topic, dynamic, never a scoring reference
- Prompt helper: `Aim for one to two minutes of natural speech.`
- Section headings: `Pronunciation`, `Grammar and phrasing`, `What we heard`
- Pronunciation caveat: `Scored against the words we recognized you saying, not a fixed script, so read these as a directional guide. Recognition also tidies up disfluent speech, so some slips may not show here.`, fine print
- Critique empty state: `No grammar or phrasing notes this time, keep practicing.`
- Controls: `Record`, `Stop`, `Record again`, `Score`, `Next topic`
- Too weak: `Recording was too short or quiet, record again and speak clearly.`
- Generic failure: `Scoring failed, check the backend is running and try again.`
- Mic denied: `Allow microphone access, then record.`

## Behavior

- One topic shows at a time. The prompt is a speaking cue only, sent to the backend for storage context but never used as a scoring reference.
- The record control cycles idle to recording to recorded, the same capture path as passage scoring. There is no hard length cap, the prompt asks for one to two minutes.
- Submitting sends the clip plus the topic to `POST /api/free-topic/score`. The route transcribes the clip, scores it against that transcript, and critiques the transcript, then persists a `free-topic` session with the scores, flagged words, transcript, and critique.
- The two feedback sections stack, pronunciation first because it is the tool's core, critique second. Both are visible in one scroll rather than hidden behind tabs.
- Pronunciation reuses the passage score cards and flagged-word list, so flagged phonemes feed the weak-sound tracker and resurfacing the same way. The critique renders as up to three terse points.
- `Next topic` advances to the next prompt and clears the recording and results. `Record again` re-records the same topic.
