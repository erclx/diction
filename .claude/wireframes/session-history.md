---
title: Session history
description: The history surface where the user browses past sessions and opens one to see its scores, flagged words, and any transcript and critique
---

# Session history

The review surface for saved passage and free-topic sessions. It reads `GET /api/sessions` for a dated list, newest first, and `GET /api/sessions/{id}` for one session's four scores, flagged words, stored recording, and the mode-specific fields: the passage text for a passage read, or the recognized transcript and grammar critique for a free-topic session. Reached from the History nav in the app shell sidebar. A single-column layout at `/history` for the list and `/history/:sessionId` for the detail, so a detail is deep-linkable and the browser back button returns to the list. Drills persist as reps for the weak-sound tracker, not as history entries, so only passage reads and free-topic sittings appear here.

## List

```plaintext
┌──────────────────────────────────────────────┐
│ ☰  History                          ● Backend │ ← app shell top bar, see app-shell.md
├──────────────────────────────────────────────┤
│  Session history                              │ ← surface title
│  Review your past readings and the words      │
│  each one flagged.                            │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ Jul 2, 2026, 11:14 AM          94.5  │    │ ← row: date, mode, headline score
│  │ Passage                              │    │   score colored by band
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ Jun 30, 2026, 8:02 PM          82.1  │    │
│  │ Passage                              │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

## Detail

```plaintext
│  [ ← Back to history ]                        │ ← returns to the list
│  Jul 2, 2026, 11:14 AM                        │ ← session date heading
│  Passage                                      │ ← mode label
│  Passage                                      │ ← section heading for the text read
│  ┌──────────────────────────────────────┐    │
│  │ The early bird catches the worm.      │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ ← four score metrics
│  │   90.9   │ │   94.5   │ │   98.0   │ │   94.0   │ │   colored by band
│  │ Complete │ │ Accuracy │ │ Fluency  │ │ Phoneme  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  Your recording                               │ ← shown when a clip is stored
│  ┌──────────────────────────────────────┐    │
│  │ ▶  ──────────●────────  0:04 / 0:11   │    │ ← replay your own read
│  └──────────────────────────────────────┘    │
│  Flagged words                                │
│  ┌──────────────────────────────────────┐    │
│  │ [🔊][🗣] thought  (θ)                 │    │ ← own span when stored, native reference
│  │ The "th" came out as "t"...           │    │
│  └──────────────────────────────────────┘    │
│  Grammar and phrasing                         │ ← free-topic only, the stored critique
│  ┌──────────────────────────────────────┐    │
│  │ Use past tense: "we drove".           │    │
│  └──────────────────────────────────────┘    │
│  What you said                                │ ← free-topic only, the recognized transcript
│  ┌──────────────────────────────────────┐    │
│  │ we drives to the park...              │    │
│  └──────────────────────────────────────┘    │
```

## Empty

```plaintext
│  Session history                              │
│  Review your past readings and the words...   │
│                                               │
│         No sessions yet. Score a passage      │ ← onboarding empty state
│         to start your history.                │
│              [ Read a passage ]               │ ← next action, routes to Practice
```

## Copy

- Title: `Session history`
- Subtitle: `Review your past readings and the words each one flagged.`
- Back control: `Back to history`
- Passage heading: `Passage`
- Recording heading: `Your recording`
- Free-topic critique heading: `Grammar and phrasing`
- Free-topic transcript heading: `What you said`
- Metric labels: `Completeness`, `Accuracy`, `Fluency`, `Phoneme quality`
- Empty onboarding: `No sessions yet. Score a passage to start your history.`
- Empty action: `Read a passage`
- List load failure: `Could not load your history, check the backend is running and try again.` with a `Retry` action
- Missing session: `This session no longer exists, go back and pick another.`

## Behavior

- A row links to `/history/:sessionId` to open the detail, and `Back to history` links to `/history`. Selection reads from the route param, so a refresh or a shared link lands on the same view.
- Rows show only the date, mode, and headline accuracy, so the list read stays cheap. The full score set, passage text, flagged words, and recording load on the detail read.
- The headline accuracy and the detail metrics share one band coloring with the passage surface: green at 90 and above, amber at 75 to 89, red below 75.
- The passage text renders above the scores when the session stored it, so the reader sees what was practiced next to how it scored.
- A free-topic session renders its grammar critique and recognized transcript below the flagged words, the same two sections shown right after the free-topic analysis, so history holds everything the analysis surfaced.
- A player renders under the scores when the session has a stored clip, reusing the passage surface's own-recording transport so the reader can replay their read. Sessions saved before recording capture landed show no player.
- Each flagged word plays its own recorded span alongside the native reference when the session has a stored clip, matching the live passage surface. A session with no stored recording shows only the reference, so history stays truthful about what it can replay.
- The empty state is the onboarding case, distinct from a filtered-empty case, and routes the user to Practice. The list fails fast with a Retry, and an unknown id shows a not-found message rather than a spinner.
