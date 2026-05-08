---
name: fiship-design
description: Use this skill to generate well-branded interfaces and assets for fiShip (遊漁船予約管理システム — a Japanese reservation-management SaaS for fishing-charter boat captains), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. Use `colors_and_type.css` as the design-token source. Inline the relevant CSS vars or `<link>` to it.

If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference (read README.md for the full rules)

- **Audience**: Japanese fishing-charter captains, **30–60代男性、ITリテラシー低め、屋外使用**. Mobile-first, max-width 520px.
- **Brand colors**: `#1E5F8E` ocean (primary, mid-day clear water), `#3FA0D9` ocean-light (secondary), `#D4AC0D` gold (single accent moment per screen). Gradient surfaces fade to `#04192B` abyss.
- **Type**: Noto Sans JP, weights 400 / 600 (self-hosted SemiBold) / 700.
  **v2 LARGE-FIRST scale**: body **18px**, labels 20px, input text 22px,
  primary button label **22–24px**, H1 28–32px, hero 40px.
  **絶対ルール：商品UIに14px未満の文字は登場させない。** 「小さい文字はNG」。
- **Hard rules** (v2 large-first override of `source-brief.md`):
  1 screen / 1 action · **min 56px tap, primary CTA 64px** · no IT jargon (OCR, PDF, Webhook…) · ≤4 options per choice with sensible default · 文字は必ず大きく・コントラスト高く (WCAG AA min, AAA on CTA).
- **Status word lock-in**: 「満員」「休船日」「承認待ち」「承認済」「お断り」.
- **Iconography**: 7 Unicode glyphs only (⚓ ◀ ▶ ✕ ✓ → ←). No icon font, no decorative emoji, no hand-drawn SVG illustrations.
- **No shadows for elevation, no gradients, no blurs, no imagery in product.** Borders + filled tints only.

## Components ready to copy

`ui_kits/captain_app/Primitives.jsx` exports `T` (token bag), `BrandMark` (= `AnchorTile` alias), `Button`, `Field`, `Input`, `Pill`, `TopBar`, `OceanHeader`, `ErrorBanner`. Lift these directly into prototypes.

## Caveats

- No Figma file was provided. All visual rules were derived from the upstream Next.js source.
- Fonts are loaded from Google Fonts at runtime. There are no bundled `.woff2` files in `fonts/`.
- No marketing surfaces, no public booking site, no slide template exist upstream — design those from first principles using the rules in README.md.
