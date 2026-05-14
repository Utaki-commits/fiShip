# Playwright Validation

## Purpose

- Validate FiShip UI from a mobile-first perspective.
- Keep QA context in GitHub so future AI sessions can continue without human explanation.

## Commands

- List tests without launching browsers:
  - `npm run test:e2e:list`
- Run Playwright tests:
  - `npm run test:e2e`
- Run Playwright UI:
  - `npm run test:e2e:ui`

## Default Target

- Local app: `http://127.0.0.1:3000`.
- Override with `PLAYWRIGHT_BASE_URL`.
- Skip local web server with `PLAYWRIGHT_SKIP_WEB_SERVER=1`.

## Required Coverage

- Login screen loads and shows main actions.
- Register screen loads and shows onboarding fields.
- Public reservation invalid UUID path shows a safe error.
- Dashboard routes must be tested with authenticated fixtures before adding destructive tests.
- Unauthenticated dashboard/register flows may redirect; keep initial smoke tests on stable public routes unless auth fixtures are added.

## Prohibited

- Do not run destructive booking/delete tests against production.
- Do not store credentials in tests.
- Do not rely on chat context for test setup.
