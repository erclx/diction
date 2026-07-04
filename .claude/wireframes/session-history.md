---
title: Session history
description: The history surface where the user browses past sessions and opens one to see its scores and flagged words
---

# Session history

The review surface for saved practice sessions. It reads `GET /api/sessions` for a dated list, newest first, and `GET /api/sessions/{id}` for one session's four scores and flagged words. Reached from the Practice and History nav in the app shell header. A single-column layout at `/history` for the list and `/history/:sessionId` for the detail, so a detail is deep-linkable and the browser back button returns to the list.

## List

```plaintext
┌──────────────────────────────────────────────┐
│ Diction   Practice History        ● Backend   │ ← app shell header, History active
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
│  Passage                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ ← four score metrics
│  │   90.9   │ │   94.5   │ │   98.0   │ │   94.0   │ │   colored by band
│  │ Complete │ │ Accuracy │ │ Fluency  │ │ Phoneme  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  Flagged words                                │
│  ┌──────────────────────────────────────┐    │
│  │ thought  (θ)                          │    │ ← no play control, audio is not stored
│  │ The "th" came out as "t"...           │    │
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
- Metric labels: `Completeness`, `Accuracy`, `Fluency`, `Phoneme quality`
- Empty onboarding: `No sessions yet. Score a passage to start your history.`
- Empty action: `Read a passage`
- List load failure: `Could not load your history, check the backend is running and try again.` with a `Retry` action
- Missing session: `This session no longer exists, go back and pick another.`

## Behavior

- A row links to `/history/:sessionId` to open the detail, and `Back to history` links to `/history`. Selection reads from the route param, so a refresh or a shared link lands on the same view.
- Rows show only the date, mode, and headline accuracy, so the list read stays cheap. The full score set and flagged words load on the detail read.
- The headline accuracy and the detail metrics share one band coloring with the passage surface: green at 90 and above, amber at 75 to 89, red below 75.
- Flagged words render without a play control here, unlike the passage surface, because only scores and flagged words are stored, not the recorded audio.
- The empty state is the onboarding case, distinct from a filtered-empty case, and routes the user to Practice. The list fails fast with a Retry, and an unknown id shows a not-found message rather than a spinner.
