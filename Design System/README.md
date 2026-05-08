# fiShip Design System

> 遊漁船予約管理システム — a 24/7 reservation-management SaaS
> for Japanese fishing-charter boat captains (遊漁船船長).

## Product context

fiShip ("フィシップ", read as *fish + ship*) is a single mobile-first SaaS
product. It exists for one primary user:

- **Captain** (船長) — runs a fishing-charter boat (遊漁船).
- 30–65 years old, predominantly male, **low IT literacy**.
- Often standing on a boat, in salt spray, in sun. May have wet/cold hands.

The product replaces the captain's current workflow — phone calls, SNS DMs
(LINE, Instagram), paper passenger logs — with a single screen they can run
from a phone.

### What it does

- Receive bookings 24/7 (automatic, no phone tag required).
- Approve / decline pending requests (`承認待ち` → `承認済` / `お断り`).
- Show a month calendar of bookings with capacity per day.
- Hold customer + passenger data for safety regulations.

### Surfaces present in the codebase

| Route | What it is |
|---|---|
| `/` | Brand splash ("セットアップ完了") |
| `/login` | Captain email + password login |
| `/register` | 3-step vessel onboarding (name → port → style) |
| `/dashboard` | Calendar + day-detail with approve / decline |

That's the entire product. There is **no public-facing booking site**, no
admin/back-office, no marketing pages in the codebase — just the captain's
operational app.

## Sources

- **Codebase** — `Utaki-commits/fiShip` (GitHub, default branch `main`),
  imported into this project under `app/` and `lib/`.
- **Brief** — `CLAUDE.md` in the source repo (preserved at
  [`source-brief.md`](./source-brief.md)). Contains the canonical UX rules
  ("1画面1アクション", min 44px tap, no IT jargon, 4 choices max),
  color/word conventions, and database schema.
- **No Figma, no marketing copy, no slide template** were provided.

---

## Index

| File | What's in it |
|---|---|
| [`README.md`](./README.md) | This file. Brand + visual + content rules. |
| [`source-brief.md`](./source-brief.md) | Verbatim copy of the captain-facing brief (`CLAUDE.md` in source). |
| [`colors_and_type.css`](./colors_and_type.css) | All design tokens — color, type, spacing, radii — as CSS vars. |
| [`SKILL.md`](./SKILL.md) | Skill manifest — load this in a fresh chat to design with the fiShip system. |
| `assets/` | Logo, anchor mark, screen exports. |
| `fonts/` | (loaded from Google Fonts at runtime — see Typography). |
| `preview/` | Per-token / per-component preview cards (registered in the Design System tab). |
| `ui_kits/captain_app/` | High-fidelity recreation of the captain mobile app — login → register → dashboard. See `ui_kits/captain_app/README.md`. |
| `app/`, `lib/` | Imported source from the upstream Next.js project. Reference, not authored here. |

## Caveats — please read

- **No Figma file** was provided. Every rule in this system was derived
  from reading the upstream Next.js source (`app/login`, `app/register`,
  `app/dashboard`) and the captain-facing brief (`source-brief.md`). If
  you have a Figma file, attaching it would let me confirm or correct the
  visual decisions inferred from code.
- **No font files are bundled.** The codebase loads Noto Sans JP from
  Google Fonts at runtime. The `fonts/` folder is intentionally absent —
  add the WOFF2 files there if you need offline use. **No font
  substitution was made; this matches the upstream choice exactly.**
- **No public-facing customer surface, no marketing pages, no slide
  template** exist upstream. The design system documents only what
  fiShip actually has — a captain mobile webapp. Marketing / consumer
  surfaces, if added later, should be designed from the visual
  foundations here, not reverse-engineered.
- **Calendar UI shows daytime trips (昼便) only.** The brief mentions a
  night-trip (夜便) state with a separate purple color, but the upstream
  schema stores `bin_type` as a string and no UI exists for night cells.
  Adding a night-trip variant is a design decision, not a recreation.
- **Brand mark is customer-supplied** — the final 遊漁船サンライズ
  artwork lives at `assets/brand-mark.png` (a sport-fishing boat
  cutting through 青海波 waves inside a navy ring). It flows through
  every surface that references it.

---

## Brand identity

- **Name**: fiShip — written `fiShip` (lowercase `f`, capital `S`). The
  capital `S` echoes the seam between *fish* and *ship*.
- **Mark**: **customer-supplied** — a circular seal of a sport-fishing
  boat cutting through 青海波 waves, in navy ink. Lives at
  `assets/brand-mark.png`. All surfaces (top bar, login splash,
  register header, slides) pull from that single file — replace it
  to update everywhere.
  reference this single path so the rollout is one file-replace.
- **Personality**: trustworthy, plainspoken, slightly utilitarian. The app
  is a tool, not an experience. Think *port-authority paperwork redrawn for
  a phone* — not *consumer SaaS*.

### Voice & language

Japanese (`lang="ja"`) only — there is no English UI in the product.
This system documents the rules in English for the design team, but every
piece of in-product copy must be Japanese.

---

## Content fundamentals

The brief contains an explicit list of UX rules. They are non-negotiable.

### Rules (v2 LARGE-FIRST override of `CLAUDE.md` originals)

- **1画面1アクション** — one primary action per screen. The dashboard
  shows a calendar, taps a day, surfaces *one* approve/decline pair.
- **タップ対象は最小56px以上・主要CTAは64px** — raised from the original
  44px floor. Buttons are 64px tall with 22–24px labels; inputs are 64px tall
  with 22px field text; calendar nav buttons are 56px; toggle switches are
  72×40px. **No tap target is below 44px and primary CTAs are at least 64px.**
  Captain may be wearing gloves on a moving deck.
- **IT用語禁止** — banned words include OCR, PDF, Webhook. If a captain
  wouldn't say it on the dock, don't put it on screen.
- **選択肢は4つ以下・デフォルト値を適切に設定** — never offer more than
  4 options at a choice point, and pre-select a sensible default.
  (Capacity onboarding: 4 / 6 / 8 / 10 名 — exactly four.)
- **文字は必ず大きく — v2 LARGE-FIRST** — absolute minimums in product UI:
  - **本文 / paragraph: 18px** (was 13–15px)
  - **フォームラベル / list-item title: 20px** (was 13–14px)
  - **入力欄 / input field text: 22px** (was 15px)
  - **主要ボタン / primary button label: 22–24px** (was 16px)
  - **画面タイトル / H1: 28–32px** (was 20px)
  - **キャプション / status pill / dow header: 14px MINIMUM** (was 9–11px)
  - **14px 未満の文字は商品UIに登場させない。** 例外なし。
  
  Rationale: target user is **30〜60代男性、ITリテラシー低め、屋外使用**。
  老眼 + 太陽光 + 海面反射 = 14px is already a tight minimum. 「小さい文字はNG」。
- **コントラストは高く** — minimum WCAG AA (4.5:1) on body, AAA (7:1) on
  primary CTAs. Body text is `#111827` on `#F8F9FA` (≈16:1).

### Word-level conventions

- **Polite, plain Japanese** — keigo just enough to feel respectful, not
  formal-stiff. Sentence-final です / ます forms.
- **No "I" / "you" pronouns**. Subject is implicit.
- **Standardized status words**:
    - `満員` (full) — never `空きなし` or `予約不可`.
    - `休船日` (closed) — never `お休み`, `休業日`, `運休`.
    - `承認待ち` / `承認済` / `お断り` — for booking states.
- **Help text is hand-holding**, not aspirational. e.g.
  - "あとから変更できます" (you can change this later) under a label
  - "グループで船を借り切る予約です" (a booking where the whole boat is reserved by a group) under "貸切（チャーター）も受け付ける"
  - "「初心者歓迎」と案内に表示されます" (will be shown as "Beginners welcome" on your listing)
- **Examples are concrete and Japanese**. Placeholder for vessel name is
  `例：海皇丸`. For port, `例：糸島市志摩野北漁港`. For price,
  `例：お一人様 15,000円（エサ・氷代込み）`. Never `Lorem ipsum`,
  never abstract `John Doe`-style placeholders.
- **Required-field marker** is a small red `必須` badge in white-on-`#B91C1C`,
  **14px / 700**, set inline next to the label. Never an asterisk, never below 14px.

### Tone, casing, emoji

- **No casing rules**: Japanese has no case. Latin substrings (`STEP 1 / 3`,
  `fiShip`) are written as-is — no shouting CAPS, no Title Case.
- **Emoji**: minimal and functional. The product uses exactly:
  - ⚓ — brand anchor mark, only in the logo tile
  - ✓ — confirmation suffix on success buttons (`登録する　✓`)
  - ← / → — full-width arrows in step navigation (`次へ　→`, `← 戻る`)
  - ◀ ▶ ✕ — calendar nav, dismiss
  - 🟠 — never. Status colors come from filled shapes, not emoji.
- **No exclamation marks**, no emoticons, no kaomoji.

---

## Visual foundations

The visual language is **flat, high-contrast, border-led**. There are no
gradients, no shadows on cards, no glass effects, no skeumorphism. Elevation
is communicated by **1px borders** and **filled tinted regions**, not by
shadows. The one shadow in the entire codebase is on a toggle-switch knob.

### Color

Three brand colors, used in this priority:

1. `#0A3D62` **Ocean** — every header, every primary CTA, every
   selected-state outline. The "default" brand surface.
2. `#2E86C1` **Ocean-light** — Saturday-column text, active option borders,
   toggle "on" track. Used as a *secondary* tone — never a hero.
3. `#D4AC0D` **Gold** — anchor-tile background, "today" outline on calendar,
   the *register* CTA on the final onboarding step. Used as a **single
   moment of warmth** per screen — sparingly.

A muted neutral scale (`#F8F9FA` shell → `#fff` surface → `#E5E7EB` border →
`#9CA3AF`/`#6B7280`/`#111827` text) carries everything else.

Semantic statuses use **paired bg+fg pastels** rather than saturated chips:

| Status | bg | fg |
|---|---|---|
| 昼便・空きあり | `#E8F4FD` | `#0A3D62` |
| 夜便・空きあり | `#DDD6FE` | `#4338CA` |
| 満員 / ≤2名 | `#FEE2E2` | `#B91C1C` |
| 貸切・承認待ち | `#FEF9C3` | `#854D0E` |
| 休船日 | `#F1F5F9` | `#6B7280` |
| 承認済 | `#D4EDDA` | `#1B6B3A` |

Day-of-week color: Sunday is `#B91C1C` (red), Saturday is `#2E86C1` (blue),
weekdays are `#111827`. This matches Japanese calendar convention.

### Typography

- One family: **Noto Sans JP**, weights `400` / `600` (self-hosted SemiBold)
  / `700`. 400 + 700 from Google Fonts at runtime; the customer-supplied
  SemiBold lives in `fonts/NotoSansJP-SemiBold.ttf` and is the preferred
  weight for buttons and primary copy.
- **v2 LARGE-FIRST scale** — the original codebase scale (9–20px) was too
  dense for our target captain. The system now reads:

| Token | Size | Use |
|---|---|---|
| `--t-meta`    | **14px** | THE MINIMUM — pills, dow header, captions |
| `--t-sm`      | 16px | secondary copy, list-item subtitles, badges |
| `--t-base`    | **18px** | DEFAULT body — paragraph, list-item title, calendar dates |
| `--t-md`      | 20px | form labels, primary list-item titles |
| `--t-lg`      | 22px | input text, calendar month title |
| `--t-xl`      | 24px | primary button label, panel titles |
| `--t-2xl`     | 28px | H2 — screen sub-titles |
| `--t-3xl`     | 32px | H1 — screen titles, hero brand |
| `--t-display` | 40px | splash / login hero |

- **Never go below 14px in product UI.** Older users + outdoor light +
  reading glasses = 14px is already a tight minimum.
- Weight is mostly bimodal — body copy is `400`, primary copy / labels /
  CTAs are `600` (SemiBold), true emphasis (errors, hero titles) is `700`.
- Line-height: 1.7 for body paragraphs, 1.3–1.4 for headings, 1.5 for help text.

### Spacing

A loose 2/4/6/8/10/12/14/16/20/24 px scale. Cards are padded `14–16px`
inside, screen gutters are `12–16px`, the captain app constrains body width
to `maxWidth: 480px`.

### Backgrounds, imagery, illustration

- **No imagery in product**. No photos, no illustrations, no backdrop
  patterns. The shell is a flat `#F8F9FA` and the brand surfaces are flat
  `#0A3D62`.
- The one decorative move in the codebase is the **register-screen header**:
  the ocean band ends with an inverted-half-disc cutout
  (`borderRadius: 50% 50% 0 0 / 100% 100% 0 0`) — like the curve of a hull
  or a rising sun. Use this curve sparingly, in marketing surfaces that
  need a moment of warmth.
- For marketing / slides built on top of this system, full-bleed deep-blue
  ocean imagery (cool, slightly desaturated, no people) is acceptable.
  Avoid sunset / golden-hour stock — keep the imagery feeling like *work
  weather*, not *vacation*.

### Borders, radii, shadows

- **Borders** are 1px `#E5E7EB` for hairlines, 2px `#E5E7EB` for inputs and
  inactive option chips, 2px brand-color for selected state.
- **Radii** scale: 6 → 8 → 10 → 12 → 14 → 16 → 99 (pill). Inputs are 10,
  primary buttons are 12, cards are 14, the login card is 16. Logos are 14
  (small) or 16 (large).
- **Shadows** are not used for elevation. The single shadow is
  `0 1px 3px rgba(0,0,0,0.2)` on a toggle-switch thumb.

### Animation, hover, press

- **Transitions**: `.15s` to `.2s` on color/border/transform changes. No
  spring physics, no bounces.
- **Hover**: rare on a touch product. When present, surfaces darken `5–10%`.
  Don't add hover states to anything a captain might tap — it confuses the
  desktop preview vs. the real device.
- **Press / active**: brief opacity dip (`.7`). Buttons do **not** shrink
  on press — older users perceive shrink as "the button moved away".
- **Loading states**: button text swaps to `…中…` form
  (`ログイン中...`, `登録中...`) and background goes to `#E5E7EB` /
  `#9CA3AF`. No spinners.
- **Disabled**: same `#E5E7EB` bg / `#9CA3AF` fg as loading.

### Transparency, blur

- Used twice in the codebase, both on `#0A3D62`:
  `rgba(255,255,255,0.7)` for sub-text on the dark header, and
  `rgba(255,255,255,0.15)` background + `rgba(255,255,255,0.3)` border for
  the "ログアウト" pill. **No blurs anywhere.** Don't introduce
  `backdrop-filter`.

## Iconography

fiShip's iconography is **deliberately minimal**. The captain app contains
**no icon font, no SVG icons, no PNG icon set**. Glyphs come from two
sources only:

### 1. Unicode characters (used as functional icons)

| Glyph | Codepoint | Where it appears | Meaning |
|---|---|---|---|
| (img) | — | Brand mark — customer-supplied PNG at `assets/brand-mark.png` (boat + 青海波 seal) | "this is fiShip" |
| ◀ | U+25C0 | Calendar header, prev-month button | back / previous |
| ▶ | U+25B6 | Calendar header, next-month button | forward / next |
| ✕ | U+2715 | Booking-detail panel | dismiss |
| ✓ | U+2713 | Submit-button suffix (`登録する　✓`, `セットアップ完了 ✓`) | success / confirm |
| → | U+2192 | Step-form forward CTA (`次へ　→`) | proceed |
| ← | U+2190 | Step-form back button (`← 戻る`) | retreat |

That's the entire icon set in production code. **Add to it sparingly.**
If you need a new icon for a new screen, prefer (in order):
1. Another single Unicode glyph (📞, 📍, 📅 are acceptable for *contact*,
   *location*, *date*) — but stay restrained.
2. A simple line SVG, 24×24, 1.5–2px stroke, currentColor.
3. Lucide (`https://unpkg.com/lucide-static`) for anything that genuinely
   needs an icon system. **Flag any icon-set introduction** to the user
   so the choice is conscious.

### 2. Filled colored shapes (used as status indicators)

The dashboard calendar uses **6×6px circles** as a "pending booking" dot
on a date cell, in `#D97706`. The dot *is* the icon — there is no
illustration of an exclamation mark or a bell.

### What fiShip never uses

- **No emoji as decoration**. The four emoji shapes (⚓ ✓ ← →) are *load
  bearing*, not decorative. Don't add 🎣 to a fishing-themed surface.
- **No icon-only buttons** (every button has a text label; the calendar
  arrows are an exception because their meaning is universal).
- **No illustrated empty-states**. The empty-state for "no bookings" is
  literally the gray text `予約はありません` centered in a card.
- **No mascot character**, no sea creatures, no sailing-knot motifs. The
  brand is a working tool, not a children's book.

### Logo / brand mark

The mark is the **anchor glyph on a gold tile**, sized to match its
context:

| Context | Tile | Glyph size | Radius |
|---|---|---|---|
| Splash / hero | 64×64 | 32px | 16 |
| Login card | 56×56 | 28px | 14 |
| Dashboard top-bar | 36×36 | 16px | 8 |

There is no separate wordmark in the codebase. Where the brand name is
shown, it is set as plain `#fff` Noto Sans JP 700 (`遊漁船予約システム`
on splash/login; `fiShip` is the project codename, not a customer-facing
name).

`assets/brand-mark.png` is the single source-of-truth file for the
brand mark — a customer-supplied 遊漁船サンライズ seal. Replace that
file to update every surface.

### Layout rules

- **Constrain to mobile**: every screen wraps in
  `maxWidth: 480px; margin: 0 auto`. The desktop view shows the same
  480px-wide app centered on `#F8F9FA`. Do not design for tablet/desktop
  layouts — the captain is on a phone.
- **Sticky top bar** on the dashboard (`position: sticky; top: 0; z: 20`)
  with the vessel name + pending-count pill.
- **Full-width primary buttons** on every form. Side-by-side
  back/next pairs use `display: flex; gap: 8px`.
- **One CTA per screen.** Secondary actions are ghost-style (transparent
  bg, gray text, gray 2px border).
