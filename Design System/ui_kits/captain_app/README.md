# UI kit · Captain app

A high-fidelity recreation of the **only product surface** in fiShip — the
captain-facing mobile webapp. The upstream code is a Next.js 14 app under
`/app`; this kit collapses it into a single client-side React app suitable
for design iteration.

## Run it

Open `ui_kits/captain_app/index.html`. A floating route-switcher (bottom
center) lets you jump between the three screens — exactly as a captain
experiences the product end-to-end.

## Component map

| File | What's in it | Maps to upstream |
|---|---|---|
| `Primitives.jsx` | Token bag (`T`), `AnchorTile`, `Button`, `Field`, `Input`, `Pill`, `TopBar`, `OceanHeader`, `ErrorBanner` | inline styles in `app/login`, `app/register`, `app/dashboard` |
| `LoginScreen.jsx` | Captain email/password login | `app/login/page.tsx` |
| `RegisterScreen.jsx` | 3-step vessel onboarding (name → port → style) | `app/register/page.tsx` |
| `DashboardScreen.jsx` | Calendar + day-detail with approve/decline | `app/dashboard/page.tsx` |
| `App.jsx` | Fake router + route-switcher chrome | n/a (kit only) |
| `ios-frame.jsx` | (available but unused — feel free to wrap `App` in one) | n/a |

## Fidelity choices

- **Pixel-perfect to the upstream code.** Every padding, color, radius, and
  font-size in this kit was lifted directly from
  `app/{login,register,dashboard}/page.tsx`.
- **Auth and persistence are stubbed.** `Login` accepts any non-empty pair;
  `Register` simulates a 500ms write; `Dashboard` is seeded with 9 mock
  bookings on April 2026. There is no Supabase round-trip.
- **Calendar shows one bin (昼便) only.** The brief defines a separate 夜便
  state but the upstream `Booking` row only stores `bin_type` as a string —
  there is no UI for night-trip cells in the source. Adding a night-trip
  variant is a design decision, not a recreation.
- **Capacity-driven "satoshi-2" red.** The production rule is "残り2名以下
  で赤色表示". The dashboard implements this against `vessel.capacity` so
  the red treatment surfaces on full days in the seed data.

## What's deliberately missing

- A public-facing booking site for end customers — none exists in the source.
- Customer / passenger-log management screens — schema exists in `CLAUDE.md`
  but no UI is implemented upstream.
- Settings / vessel-edit — also absent from the source.

If you need any of these, **design from the brief; do not reverse-engineer
from screenshots**. The captain's UX rules in `source-brief.md` are the
authority.
