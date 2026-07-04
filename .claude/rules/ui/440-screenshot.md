---
description: Visual verification for frontend component and stylesheet changes
paths:
  - 'frontend/src/**/*.tsx'
  - 'frontend/src/**/*.css'
---

# FRONTEND SCREENSHOT STANDARDS

## Visual verification

- Run `bun run screenshot` after changing a frontend component or stylesheet, then review the light and dark captures for the touched surface before treating the change as done.
- Add or update a case in `e2e/screenshot.ts` when a change introduces a new surface or a visually distinct state, so the capture set stays complete.
- Cover the states that carry the change. A score-band or feedback-color change needs a fixture that exercises each band, not only the default one.
- Treat the screenshot set as the verification of record for visual-only items. A state proven in a light and dark capture does not need a separate manual pass. Reserve manual UX checks for interaction and flow the captures cannot show, such as multi-step mutations, Escape dismissal, and focus order.
