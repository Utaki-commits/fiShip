# UI Exploration

## Purpose

- Store rough UI concepts from Uizard, v0, or other exploration tools.
- Keep exploration separate from production implementation.
- Make future AI sessions able to inspect concept work without relying on chat.

## Status

- Exploration output is not production source of truth.
- Figma is the official design DB when available.
- Production implementation must follow:
  - `AI_ORCHESTRATION.md`
  - `docs/ai-orchestration/*`
  - `docs/design-system/*`
  - current app code

## Directory Structure

- `docs/ui-exploration/uizard-output/`
  - rough Uizard exports and notes.
- `docs/ui-exploration/concept-ui/`
  - v0 or other concept UI notes and snippets.

## Required Metadata for Each Concept

- Date.
- Tool used.
- Target screen.
- Problem being explored.
- Screenshots or links.
- Which parts were accepted.
- Which parts were rejected.

## Prohibited

- Do not treat exploration output as final implementation.
- Do not add a new design system from exploration.
- Do not overwrite production rules with concept-only decisions.
