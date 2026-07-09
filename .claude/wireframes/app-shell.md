---
title: App shell
description: The persistent sidebar and top bar that wrap every surface, and how they collapse and go mobile
---

# App shell

The frame around every routed surface. A left sidebar lists the practice and review modes, and a slim top bar carries the section title and global controls. The surface content renders to the right of the sidebar and below the top bar.

## Desktop (≥768px)

```plaintext
┌───────────────┬──────────────────────────────────────┐
│ ≋ Diction     │ ☰ Progress   ● Backend ♪ Heart ▾  ◐  │ ← top bar
│               ├──────────────────────────────────────┤
│ • Practice    │                                      │
│               │   routed surface content             │
│ Review        │                                      │
│ • History     │                                      │
│ • Progress    │                                      │
│               │                                      │
└───────────────┴──────────────────────────────────────┘
   ↑ sidebar: brand, primary nav, Review group; each item leads with an icon
```

## Collapsed rail

```plaintext
┌────┬───────────────────────────────────────────────────┐
│ ≋  │ ☰  Practice     ● Backend  ♪ Heart ▾   ◐          │
│    ├───────────────────────────────────────────────────┤
│ •  │                                                   │
│ •  │   routed surface content                          │
│ •  │                                                   │
└────┴───────────────────────────────────────────────────┘
   ↑ labels hidden, brand and nav shrink to icons, hover shows the label
```

## Mobile (<768px)

```plaintext
┌────────────────────────────┐     ┌──────────────┬─────────┐
│ ☰  Practice   ● ♪ Heart▾ ◐ │     │ ≋ Diction    │▓▓▓▓▓▓▓▓▓│
├────────────────────────────┤     │              │▓▓▓▓▓▓▓▓▓│
│                            │     │ • Practice   │▓▓▓▓▓▓▓▓▓│
│   routed surface content,  │     │              │▓▓▓▓▓▓▓▓▓│
│   full width               │     │ Review       │▓▓▓▓▓▓▓▓▓│
│                            │     │ • History    │▓▓▓▓▓▓▓▓▓│
│                            │     │ • Progress   │▓▓▓▓▓▓▓▓▓│
└────────────────────────────┘     └──────────────┴─────────┘
   ↑ sidebar hidden, toggle in top bar    ↑ toggle opens it as a drawer over dimmed content
```

## Copy

- Brand: `Diction`
- Primary nav: `Practice`, led by `Routine` above `Passage` and `Shadowing`
- Review group label: `Review`, over `History` and `Progress`
- Section title: mirrors the active surface (`Practice`, `History`, `Progress`), dynamic
- Backend status: `Backend: <state>`, where state is `checking`, `ok`, or `error`, dynamic
- Voice picker: the selected reference voice, grouped by accent (`American`, `British`) with each option naming the voice and gender, dynamic

## Behavior

- The sidebar lists every practice and review surface, grouped, so all modes stay visible at a glance rather than behind a menu. The list grows as new modes land.
- The active surface stays highlighted in the nav and names the top-bar section title.
- On desktop the sidebar collapses to an icon rail. A toggle in the top bar and a keyboard shortcut both switch it, and the collapsed choice is remembered on the next visit.
- Below the mobile breakpoint the sidebar hides and the top-bar toggle opens it as a drawer over dimmed content. Choosing a destination closes the drawer.
- The backend status, the voice picker, and the theme control sit at the top-bar right on every surface. The status shows a colored dot and drops its text label on narrow widths.
- The voice picker sets the reference voice for the whole app, so every native-reference control speaks the chosen voice. Switching it mid-clip stops any reference audio already playing, and the choice is remembered on the next visit.
- Shell composition and token detail live in `.claude/context/frontend.md`.
