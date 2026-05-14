# Design Tokens

## Source of Truth

- Runtime token source: `src/app/globals.css`.
- Historical design-system source: `Design System/colors_and_type.css`.
- When the two differ, implementation must follow `src/app/globals.css` unless Figma or a new approved design-system update says otherwise.
- Use CSS variables in product UI. Do not hard-code a new palette.

## Base Colors

| Token | Light | Dark | Usage |
|---|---:|---:|---|
| `--ocean` | `#2563EB` | `#3B82F6` | Primary actions, active tabs, main brand blue |
| `--ocean-deep` | `#1E40AF` | `#1E40AF` | Deep ocean accent |
| `--ocean-light` | `#3B82F6` | `#60A5FA` | Outlines, secondary ocean emphasis |
| `--ocean-pale` | `#EFF6FF` | `#0F172A` | Pale active backgrounds |
| `--gold` | `#D4AC0D` | `#F59E0B` | Today, highlight, charter-like emphasis |
| `--bg` | `#F8FAFC` | `#0F172A` | Page background |
| `--surface` | `#FFFFFF` | `#111827` | Cards, inputs, modal surfaces |
| `--border` | `#E5E7EB` | `#1F2937` | Card/input borders |
| `--fg-1` | `#1F2937` | `#E2E8F0` | Primary text |
| `--fg-2` | `#6B7280` | `#94A3BB` | Secondary text |
| `--fg-3` | `#9CA3AF` | `#64748B` | Help text, placeholders |

## Status Colors

| Token | Light | Dark | Usage |
|---|---:|---:|---|
| `--status-day-bg` | `#EFF6FF` | `#0F1F3D` | Day bin background |
| `--status-day-fg` | `#1E40AF` | `#60A5FA` | Day bin text |
| `--status-night-bg` | `#F3F0FF` | `#1E1040` | Night bin background |
| `--status-night-fg` | `#6366F1` | `#7C5CFF` | Night bin text |
| `--status-ok-bg` | `#DCFCE7` | `#052E16` | Confirmed, contacted, success |
| `--status-ok-fg` | `#1FB36B` | `#22C55E` | Confirmed/success text |
| `--status-ok-bd` | `#86EFAC` | `#166534` | Confirmed/success border |
| `--status-full-bg` | `#FEE2E2` | `#2D0A0A` | Full, delete, error |
| `--status-full-fg` | `#B91C1C` | `#FCA5A5` | Full/delete/error text |
| `--status-full-bd` | `#FCA5A5` | `#7F1D1D` | Full/delete/error border |
| `--status-pending-bg` | `#FFF7ED` | `#1C0A00` | Pending, uncontacted warning |
| `--status-pending-fg` | `#C2410C` | `#FF8A00` | Pending text |
| `--status-pending-dot` | `#FF8A00` | `#FF8A00` | Pending dot/left border |
| `--status-closed-bg` | `#F1F5F9` | `#1E293B` | Closed/cancelled background |
| `--status-closed-fg` | `#6B7280` | `#64748B` | Closed/cancelled text |

## Day-of-Week Tokens

- `--dow-sunday`: `#B91C1C`
- `--dow-saturday`: `#2E86C1`
- `--dow-weekday`: `#111827`
- `--dow-header`: `#9CA3AF`

## Shadows

- `--shadow-knob`: `0 1px 3px rgba(0,0,0,0.2)`
- `--shadow-card`: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`

## Prohibited

- Do not create new colors for normal UI states.
- Do not use light-only colors without checking dark mode.
- Do not use Figma/Uizard/v0 output colors unless mapped to these tokens.
