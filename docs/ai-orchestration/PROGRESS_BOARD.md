# PROGRESS BOARD - fiShip AI Orchestration

## Overall Status
UX_REVIEW_PENDING

## Current Phase
- Phase: captain-ui base component separation
- Date: 2026-05-28
- Owner: Codex

## Scope
- Create reusable captain UI primitives under `src/components/captain-ui/`.
- Base visual rules on the existing captain UI style currently used in dashboard screens.
- Do not migrate existing dashboard screens in this phase.

## Task Checklist
- [x] `CaptainButton` implemented
- [x] `CaptainCard` implemented
- [x] `CaptainInput` implemented
- [x] CSS Modules used
- [x] No inline `style={{ ... }}` in `src/components/captain-ui/`
- [x] `index.ts` exports components and types
- [x] No business logic included in UI primitives
- [x] Existing screens not modified
- [x] `npm.cmd run lint` passed with existing warnings only
- [x] `npm.cmd run build` passed with existing warnings only

## Implementation Notes
- `CaptainButton` supports `primary`, `secondary`, and `ghost` variants.
- `CaptainButton` supports `sm`, `md`, and `lg` sizes.
- `CaptainCard` supports `default`, `outlined`, and `elevated` variants.
- `CaptainCard` keeps shadow-free styling; `elevated` uses border emphasis instead of shadow.
- `CaptainInput` supports label, helper text, error text, and ARIA attributes.
- Input font size is 16px to prevent iPhone automatic zoom.

## Review Handoff
- ChatGPT or Claude should review component structure and UX rule compliance.
- This phase only creates common captain UI primitives.
- If review passes, update `Overall Status` to `UX_PASSED`.
- If review fails, update `Overall Status` to `UX_REJECTED（要修正）` and append the required fixes to the log.

## Log
- 2026-05-28 Codex: Created captain-ui base components and completed lint/build verification.
