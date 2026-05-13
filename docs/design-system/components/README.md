# Components

## Source Files

- Runtime examples:
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard/schedule/page.tsx`
  - `src/app/dashboard/vessel/page.tsx`
  - `src/app/login/page.tsx`
  - `src/app/register/page.tsx`
  - `src/app/reserve/[vesselId]/page.tsx`
- Design-kit examples:
  - `Design System/ui_kits/captain_app/Primitives.jsx`
  - `Design System/ui_kits/captain_app/DashboardScreen.jsx`
  - `Design System/ui_kits/captain_app/LoginScreen.jsx`
  - `Design System/ui_kits/captain_app/RegisterScreen.jsx`

## Shell

- Use a centered mobile shell.
- Required structure:
  - `maxWidth: '480px'`
  - `margin: '0 auto'`
  - `minHeight: '100vh'`
  - `background: 'var(--bg)'`
  - `fontFamily: 'var(--font-sans)'`

## Topbar

- Sticky where the page scrolls.
- Height at least `80px`.
- Background:
  - ocean gradient for normal pages.
  - banner image plus black overlay for vessel-branded pages.
- Text on image backgrounds must use `#ffffff` and text shadow.

## Card

- Background: `var(--surface)`.
- Border: `1px solid var(--border)`.
- Radius: `14px` to `16px`.
- Padding: `14px` to `20px`.
- Cards should present one purpose or one repeated item.

## Booking Card

- Row 1:
  - bin badge
  - optional date
  - count
  - status pill
- Row 2:
  - customer name large
  - `様`
- Row 3:
  - contacted/uncontacted state for confirmed bookings.
- Actions:
  - TEL primary on the left.
  - edit/cancel/more icon buttons on the right.
  - pending bookings show `承認する` and `お断り`.

## Form Field

- Label above input.
- Required badge when required.
- Input full-width.
- Error banner close to the relevant action.
- Helper text should be short and specific.

## Badge / Pill

- Use pill radius `99px`.
- Status must include text, not color only.
- Existing labels:
  - `昼便`
  - `夜便`
  - `昼夜便`
  - `承認済み`
  - `承認待ち`
  - `キャンセル`
  - `受付中`
  - `受付中止`
  - `満員`
  - `貸切`

## Calendar Cell

- Show date number.
- Show availability or blocked state.
- Today uses gold border.
- Selected date uses ocean border.
- Past dates use reduced opacity.
- Charter dates show `貸切` and cannot be tapped on the reservation page.

## Prohibited

- Do not introduce a separate component library without mapping to existing tokens.
- Do not use color-only state.
- Do not use emoji as the only meaning for critical actions.
- Do not add hover-only behavior.
