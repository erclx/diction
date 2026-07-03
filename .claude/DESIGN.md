# Design

Authoring guidance: `.claude/standards/design.md`.

## Personality

Diction is a private, offline practice tool for one person, not a public product. The interface should feel calm, focused, and personal, closer to a quiet workbench than a graded test. It centers content on a narrow column on a warm paper canvas, with ink-brown text. Reading surfaces, headings and the passage to read aloud, use a self-hosted Newsreader serif for warmth, while the UI chrome uses a self-hosted Source Sans 3 for clarity. Both faces are bundled locally so nothing loads over the network. Light is warm paper and dark is warm charcoal, so the mood holds at night. The user picks light, dark, or system from a header toggle, with system following `prefers-color-scheme`. The chrome stays warm and quiet so the real color belongs to feedback: a sage, ochre, and brick ramp carries score and flagged-word signal, and a single muted teal marks links and primary actions.

## Color

One row per role. Intent is a short phrase a human can picture. Value is the light-theme hex. Dark-theme overrides follow the table. These map onto shadcn/ui tokens: `background`, `card` for surface, `primary` for accent, `destructive` for error, with `success` and `warning` added as custom semantic tokens.

| Role       | Intent                       | Value   |
| ---------- | ---------------------------- | ------- |
| background | warm paper canvas            | #faf8f3 |
| surface    | cards, panels, raised blocks | #f2ede3 |
| text       | primary body text, ink       | #2b2622 |
| muted      | secondary text, captions     | #6f665b |
| accent     | links, primary action, teal  | #0f766e |
| success    | confirmations, sage          | #4f7a3f |
| warning    | cautions, ochre              | #b0741c |
| error      | failures, brick              | #b23a2e |

Dark-theme overrides: background #1c1a17, surface #24211c, text #e9e3d8, muted #a89e8f, accent #5eb3a8, success #8fc47a, warning #e0a94a, error #e8836f.

## Typography

One row per role. Size and line height in pixels or rem. Family names use their product casing.

| Role       | Family        | Weight | Size | Line height |
| ---------- | ------------- | ------ | ---- | ----------- |
| display    | Newsreader    | 500    | 40px | 120%        |
| heading    | Newsreader    | 500    | 24px | 118%        |
| subheading | Newsreader    | 500    | 20px | 130%        |
| body       | Source Sans 3 | 400    | 18px | 145%        |
| label      | Source Sans 3 | 400    | 15px | 135%        |
| code       | ui-monospace  | 400    | 15px | 135%        |

Newsreader also sets the passage to read aloud, the primary reading surface. Both families are self-hosted via Fontsource variable packages and bundled locally, so no font loads over the network.

## Spacing

Base unit and scale. The renderer draws a swatch per step. Base is 0.5rem (8px), scaled by the multipliers below.

| Step | Multiplier | Value   |
| ---- | ---------- | ------- |
| xs   | 0.5        | 0.25rem |
| sm   | 1          | 0.5rem  |
| md   | 2          | 1rem    |
| lg   | 3          | 1.5rem  |
| xl   | 5          | 2.5rem  |

## Borders

| Role    | Radius | Width | When used             |
| ------- | ------ | ----- | --------------------- |
| default | 8px    | 1px   | cards, inputs         |
| pill    | 9999px | 1px   | tags, status chips    |
| none    | 0      | 0     | edge-to-edge surfaces |

## Motion

No animation. Transitions and keyframes are avoided to keep the interface still and focused.

## Iconography

Outline icons from lucide-react, the shadcn/ui default library. No custom icons.
