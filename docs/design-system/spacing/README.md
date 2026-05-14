# Spacing

## Source

- Runtime source: `src/app/globals.css`.
- Existing screens use single-column mobile layouts with generous touch spacing.

## Spacing Tokens

| Token | Size |
|---|---:|
| `--space-1` | `2px` |
| `--space-2` | `4px` |
| `--space-3` | `6px` |
| `--space-4` | `8px` |
| `--space-5` | `10px` |
| `--space-6` | `12px` |
| `--space-7` | `14px` |
| `--space-8` | `16px` |
| `--space-10` | `20px` |
| `--space-12` | `24px` |
| `--space-14` | `28px` |
| `--space-16` | `32px` |

## Radius Tokens

| Token | Size |
|---|---:|
| `--r-sm` | `6px` |
| `--r-md` | `8px` |
| `--r-lg` | `10px` |
| `--r-xl` | `12px` |
| `--r-2xl` | `14px` |
| `--r-3xl` | `16px` |
| `--r-pill` | `99px` |

## Tap Targets

- `--tap-min`: `56px`.
- `--tap-comfort`: `64px`.
- Normal buttons must be at least `56px` tall.
- Primary CTAs and inputs should be `64px` tall.
- Icon buttons may use smaller explicit dimensions only when secondary.

## Layout Rules

- Screen shell:
  - `maxWidth: 480px`
  - `margin: 0 auto`
  - `minHeight: 100vh`
- Page body padding:
  - usually `16px`.
- Topbar padding:
  - usually `18px 20px`.
- Card padding:
  - `14px` to `20px`.
- Button gap:
  - `6px` to `10px`.

## Prohibited

- Do not make dense desktop-style tables.
- Do not reduce tap targets to fit more controls.
- Do not nest cards inside cards unless the existing UI pattern already does it.
