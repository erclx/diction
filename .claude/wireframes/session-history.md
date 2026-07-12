---
title: Session history
description: The history surface where the user browses past sessions and opens one to see its scores, flagged words, and any transcript and critique
---

# Session history

The review surface for saved passage, free-topic, and interview sessions. It reads `GET /api/sessions` for a dated list, newest first, and `GET /api/sessions/{id}` for one session's four scores, flagged words, stored recording, and the mode-specific fields: the passage text for a passage read, the recognized transcript and grammar critique for a free-topic session, or the question prompt, delivery metrics, and video for an interview rep. Reached from the History nav in the app shell sidebar. A single-column layout at `/history` for the list and `/history/:sessionId` for the detail, so a detail is deep-linkable and the browser back button returns to the list. Drills persist as reps for the weak-sound tracker, not as history entries, so only passage reads, free-topic sittings, and interview reps appear here.

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
│  Jul 2, 2026, 11:14 AM        [ 🗑 Delete ]   │ ← date heading, destructive delete at right
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

## Interview detail

```plaintext
│  Jul 2, 2026, 11:14 AM                        │ ← session date heading
│  Interview                                    │ ← mode label
│  Question                                     │ ← interview only, the prompt practiced
│  ┌──────────────────────────────────────┐    │
│  │ Tell me about a time you solved...    │    │
│  └──────────────────────────────────────┘    │
│  Answer to rehearse                           │ ← interview relabels the passage block
│  ┌──────────────────────────────────────┐    │
│  │ I led the migration and cut latency...│    │
│  └──────────────────────────────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ ← four pronunciation scores
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  Delivery                                     │ ← interview only, shown when cv is present
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   posture and eye-contact scalars
│  │ Eye 94%  │ │ Stab .82 │ │ Gest .12 │ │ Tilt 6°  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  Your recording                               │
│  ┌──────────────────────────────────────┐    │
│  │  ▶ video with controls                │    │ ← interview plays the webm as video
│  └──────────────────────────────────────┘    │
```

## Delete confirm

```plaintext
│  ┌──────────────────────────────────────┐    │ ← AlertDialog over the detail
│  │ Delete this session?                  │    │
│  │ This permanently removes the session, │    │
│  │ its flagged words, and its recording  │    │
│  │ from disk. This cannot be undone.     │    │
│  │              [ Cancel ] [ 🗑 Delete ] │    │ ← Cancel dismisses, Delete fires the mutation
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
- Delete control: `Delete session`
- Delete confirm title: `Delete this session?`
- Delete confirm body: `This permanently removes the session, its flagged words, and its recording from disk. This cannot be undone.`
- Delete confirm actions: `Cancel` and `Delete session`
- Delete pending action: `Deleting…`
- Delete failure: `Could not delete this session, try again.`
- Passage heading: `Passage`, relabeled `Answer to rehearse` for an interview session
- Recording heading: `Your recording`
- Interview question heading: `Question`
- Interview delivery heading: `Delivery`
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
- An interview session renders the question prompt above the scores and relabels the scripted-answer block to `Answer to rehearse`, so a `Question` and an answer read as a pair rather than two passages. Its delivery metrics render below the scores when the CV report persisted, and hide when the scorer degraded, so a past rep never shows zeros. The recording plays as a video rather than the audio transport, since the interview clip carries a video track.
- A player renders under the scores when the session has a stored clip, reusing the passage surface's own-recording transport so the reader can replay their read. Sessions saved before recording capture landed show no player.
- Each flagged word plays its own recorded span alongside the native reference when the session has a stored clip, matching the live passage surface. A session with no stored recording shows only the reference, so history stays truthful about what it can replay.
- The detail header carries a destructive `Delete session` control at the right of the date heading, in the detail rather than a list row so the action sits next to the full context of what is being removed. It opens an `AlertDialog` confirm rather than deleting on a single click, so a mis-tap cannot destroy a recording. Confirming fires `DELETE /api/sessions/{id}`, invalidates the list, and navigates back to `/history` where the deleted row is gone. Cancelling dismisses the dialog and fires nothing. A failed delete leaves the user on the detail with an inline error so they can retry.
- The empty state is the onboarding case, distinct from a filtered-empty case, and routes the user to Practice. The list fails fast with a Retry, and an unknown id shows a not-found message rather than a spinner.
