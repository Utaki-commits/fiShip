# Typography

## Source

- Runtime source: `src/app/globals.css`.
- Font family: `Noto Sans JP`, then `-apple-system`, `BlinkMacSystemFont`, `sans-serif`.
- Self-hosted font file: `/fonts/NotoSansJP-SemiBold.ttf`.

## Type Scale

| Token | Size | Usage |
|---|---:|---|
| `--t-meta` | `14px` | Metadata, small badges, captions |
| `--t-sm` | `16px` | Secondary body, helper text |
| `--t-base` | `18px` | Default body |
| `--t-md` | `20px` | Labels, compact section titles |
| `--t-lg` | `22px` | Inputs and prominent text |
| `--t-xl` | `24px` | Buttons, topbar titles |
| `--t-2xl` | `28px` | Large screen titles |
| `--t-3xl` | `32px` | Large date/number emphasis |
| `--t-display` | `40px` | Completion icons or display emphasis |

## Weights

- `--fw-regular`: `400`
- `--fw-semibold`: `600`
- `--fw-bold`: `700`

## Runtime Defaults

- `body`: `font-size: var(--t-base)`, `line-height: 1.7`.
- `button`: `font-size: var(--t-xl)`, `font-weight: var(--fw-semibold)`.
- `input`, `textarea`, `select`: `font-size: var(--t-lg)`.
- `label`: `font-size: var(--t-md)`, `font-weight: var(--fw-semibold)`.

## Usage Rules

- Captain-facing text should be readable outdoors.
- Product UI text should not go below `14px`.
- Input text should be large enough to verify quickly.
- Use bold for names, dates, counts, statuses, and primary actions.

## Prohibited

- Do not use tiny helper text under `14px`.
- Do not rely on thin weights for important labels.
- Do not use English labels in captain-facing screens.
- Do not scale font size with viewport width.
