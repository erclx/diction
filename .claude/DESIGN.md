# Design

Authoring guidance: `.claude/standards/design.md`.

## Personality

Diction is a private, offline practice tool for one person, not a public product. The interface should feel calm, focused, and personal, closer to a quiet workbench than a graded test. It centers content on a narrow column and leans on system fonts for a native feel, with both light and dark themes through `prefers-color-scheme`. The chrome stays neutral cool-gray so the real color belongs to feedback: a green, amber, and red ramp carries score and flagged-word signal, and a single calm violet marks links and primary actions.

## Color

One row per role. Intent is a short phrase a human can picture. Value is the light-theme hex. Dark-theme overrides follow the table. These map onto shadcn/ui tokens: `background`, `card` for surface, `primary` for accent, `destructive` for error, with `success` and `warning` added as custom semantic tokens.

| Role       | Intent                        | Value   |
| ---------- | ----------------------------- | ------- |
| background | page canvas                   | #ffffff |
| surface    | cards, panels, raised blocks  | #f8f8fa |
| text       | primary body text             | #6b6375 |
| muted      | secondary text, captions      | #888888 |
| accent     | links, primary action         | #7c3aed |
| success    | confirmations, positive state | #16a34a |
| warning    | cautions, pending state       | #d97706 |
| error      | failures, destructive action  | #dc2626 |

Dark-theme overrides: background #16171d, surface #1c1d24, text #9ca3af, muted #9ca3af, accent #a78bfa, success #4ade80, warning #fbbf24, error #f87171.

## Typography

One row per role. Size and line height in pixels or rem. Family names use their product casing.

| Role    | Family       | Weight | Size | Line height |
| ------- | ------------ | ------ | ---- | ----------- |
| display | system-ui    | 500    | 40px | 120%        |
| heading | system-ui    | 500    | 24px | 118%        |
| body    | system-ui    | 400    | 18px | 145%        |
| label   | system-ui    | 400    | 15px | 135%        |
| code    | ui-monospace | 400    | 15px | 135%        |

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
