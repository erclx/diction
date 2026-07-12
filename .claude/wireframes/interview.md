---
title: Interview
description: The interview surface where the user picks a question, records a spoken answer on camera, and sees one combined pronunciation and delivery report
---

# Interview

The single-column interview practice surface. It lists the operator's own interview questions, captures a spoken answer on camera, and returns one combined report from `POST /api/interview/score`: pronunciation first as the tool's core, then the delivery signals from the video. It mirrors the free-topic surface's two-section report shape, and it is the only surface that records video rather than audio alone.

Everything reads as directional. Pronunciation is scored against the scripted answer the user rehearses, and the delivery metrics come from a computer-vision scorer still being calibrated. A caveat above each section and the "What we heard" transcript below make that visible. See `.claude/context/interview.md` and `.claude/context/api.md`.

## Idle

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  Interview                        ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Interview                                    │ ← surface title
│  Record a spoken answer on camera and get one │
│  combined report of pronunciation and delivery│
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ Pick a question                       │    │
│  │ ┌──────────────────────────────────┐  │    │ ← grouped by category, one selected
│  │ │ Tell me about a project you led ▾│  │    │
│  │ └──────────────────────────────────┘  │    │
│  │ Tell me about a project you led.      │    │ ← the question prompt
│  │ Beats to hit  (scope) (team) (outcome)│    │ ← keyword beats as chips
│  │ Answer to rehearse            [ 🔊 ]  │    │ ← heading with native playback control
│  │ ┌──────────────────────────────────┐  │    │ ← scripted answer, hard wraps collapsed
│  │ │ I led the migration end to end.  │  │    │
│  │ └──────────────────────────────────┘  │    │
│  └──────────────────────────────────────┘    │
│                                               │
│                 [ 🎥 Record ]                 │ ← record control, disabled until a question is picked
└──────────────────────────────────────────────┘
```

## Recording

```plaintext
│  ┌──────────────────────────────────────┐    │
│  │        mirrored camera preview        │    │ ← live self-view, horizontally mirrored
│  └──────────────────────────────────────┘    │
│              ▁▃▅▇ level meter ▇▅▃▁            │ ← shared capture meter
│                  [ ⏹ Stop ]                   │
```

## Scored

```plaintext
│  Pronunciation                                │ ← section one, the tool's core
│  Scored against the scripted answer you       │ ← directional caveat, fine print
│  rehearsed, a directional guide.              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │ 90 │ │ 80 │ │ 70 │ │ 60 │                  │ ← completeness, accuracy, fluency, phoneme
│  └────┘ └────┘ └────┘ └────┘                  │
│  Flagged words                                │
│  [🔊][🗣] migration /ɡ/  The /ɡ/ scored low.  │ ← own-clip span, native reference, reason
│                                               │
│  Delivery                                     │ ← section two, the CV signals
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │82% │ │0.88│ │0.25│ │ 6° │                  │ ← eye contact, stability, gesture ratio, tilt
│  └────┘ └────┘ └────┘ └────┘                  │
│  Directional while delivery scoring is being  │ ← plain caveat, fine print
│  calibrated.                                  │
│                                               │
│  Your answer                                  │ ← self-review video of the recorded clip
│  ┌──────────────────────────────────────┐    │
│  │           ▶ recorded video            │    │
│  └──────────────────────────────────────┘    │
│                                               │
│  What we heard                                │ ← recognized transcript, grounds the caveat
│  ┌──────────────────────────────────────┐    │
│  │ I led the migration end to end        │    │
│  └──────────────────────────────────────┘    │
│              [ ↺ Record again ]               │ ← re-record the same question
└──────────────────────────────────────────────┘
```

## Empty state

```plaintext
│  ┌──────────────────────────────────────┐    │
│  │ No interview questions are configured.│    │ ← honest empty state, no fabricated bank
│  │ Point DICTION_INTERVIEW_SOURCE_DIR at │    │
│  │ a question bank to practice.          │    │
│  └──────────────────────────────────────┘    │
```

## Copy

- Title: `Interview`
- Subtitle: `Record a spoken answer on camera and get one combined report of pronunciation and delivery.`
- Question card title: `Pick a question`
- Question select placeholder: `Choose a question`
- No-selection helper: `Choose a question to see its beats and the answer to rehearse.`
- Beats heading: `Beats to hit`
- Answer heading: `Answer to rehearse`
- Answer playback control: `Hear the model answer`
- Section headings: `Pronunciation`, `Delivery`, `Your answer`, `What we heard`
- Pronunciation caveat: `Scored against the scripted answer you rehearsed. Read these as a directional guide.`, fine print
- Delivery metric labels: `Eye contact`, `Stability`, `Gesture ratio`, `Shoulder tilt`
- Delivery caveat: `Posture and eye-contact signals from the video, while the delivery scorer is still being calibrated. Read them as directional, not a grade.`, fine print
- Controls: `Record`, `Stop`, `Record again`, `Score`
- Empty state: `No interview questions are configured. Point DICTION_INTERVIEW_SOURCE_DIR at a question bank to practice.`
- Questions load failure: `Could not load questions, check the backend is running and try again.`
- Too weak: `Recording was too short or quiet, record again and speak clearly.`
- Generic failure: `Scoring failed, check the backend is running and try again.`
- Camera denied: `Allow camera and microphone access, then record.`

## Behavior

- The question list comes from the operator's env-configured bank. When the bank is empty or unset the surface shows the empty state rather than a fabricated question, since interview content is operator-owned.
- Questions group by category in the picker. Selecting one shows its prompt, its keyword beats as chips, and the scripted answer to rehearse. The scripted answer's authoring line breaks collapse to spaces for display, since the parser preserves the source wrap. The answer carries a native-playback control beside its heading, the same `ReferenceButton` and app-wide voice the passage and shadowing surfaces use, so the user can hear the model answer read aloud and shadow it. It reuses the shared reference route, whose text cap was raised to 1000 chars so a full scripted answer synthesizes.
- The record control is disabled until a question is picked, since the score route needs the scripted answer as its pronunciation reference. Changing the question resets any in-progress recording and result.
- Recording captures video and audio. A mirrored live preview shows the user while recording, and the shared capture meter reads the audio level. Denied camera or microphone access shows a clear message rather than failing silently.
- Submitting posts the clip, the scripted answer, and the question text to `POST /api/interview/score`. The route scores pronunciation against the scripted answer, runs the CV scorer on the video, transcribes for the "what we heard" line, and persists a `interview` session carrying the question as its prompt.
- The report stacks two sections in one scroll, pronunciation first because it is the tool's core, delivery second. Pronunciation reuses the passage score cards and flagged-word list, so flagged phonemes feed the weak-sound tracker the same way.
- The delivery section renders only when the response carries a `cv` block. When the CV scorer degrades the section is hidden rather than showing zeros, so an absent signal never reads as a bad score.
- The recorded clip plays back as video under `Your answer` for self-review. `Record again` clears the recording and result to re-record the same question.
