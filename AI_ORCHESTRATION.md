# AI Orchestration System

## Purpose

This repository uses an AI orchestration structure.

The goal is:

* minimize human explanation cost
* separate AI responsibilities
* make all AI replaceable
* keep project knowledge inside GitHub
* allow autonomous implementation / review / testing

This repository is NOT conversation-driven.
GitHub markdown files are the primary source of truth.

Future AI collaboration must happen through GitHub PRs, implementation reports, test results, and Preview URLs, not through conversation history.

---

# Core Principles

## 1. GitHub is the shared memory

AI must NOT depend on:

* chat history
* human explanations
* hidden context
* temporary discussions

AI MUST read:

* docs
* rules
* PR descriptions
* implementation reports
* test results

before acting.

---

## 2. Human role is minimized

Humans should only:

* review preview builds
* approve/reject changes
* prioritize tasks
* make final release decisions

Humans should NOT:

* explain implementation details between AIs
* manually summarize Codex work to Claude
* repeat project context every session

---

## 3. AI roles are separated

### ChatGPT (PM / Translator / Reviewer)

Responsibilities:

* task translation
* orchestration
* PR review
* UX review
* implementation summarization
* converting abstract UX into actionable tasks

Must NOT:

* directly implement production code

---

### Claude (Architect / UX)

Responsibilities:

* UX structure
* product reasoning
* extracting rules
* architecture discussions
* design system logic

Must NOT:

* become project memory
* require human explanation to continue work

---

### Uizard (Exploration)

Responsibilities:

* rapid UI exploration
* layout experiments
* rough concepts

Generated UI is NOT final production UI.

---

### v0 (UI Generator)

Responsibilities:

* React/Tailwind UI generation
* shadcn/ui compatible components
* mobile-first UI generation

Must follow:

* design tokens
* component rules
* Figma structure

---

### Figma (Design DB)

Figma is the official design source.

Contains:

* design system
* spacing
* typography
* components
* visual rules

AI must follow Figma.

---

### Codex (Implementation)

Responsibilities:

* implementation
* refactoring
* tests
* PR generation
* implementation reports

Before implementation:
Codex MUST read:

* AI_ORCHESTRATION.md
* docs/ai-orchestration/*
* current PR context

After implementation:
Codex MUST generate:

* implementation summary
* changed files
* UI impact
* test result summary

Codex MUST write the following into `docs/ai-reports/latest-implementation-report.md` before handoff:

* implementation purpose
* changed content
* UI impact
* screens that must be checked
* unverified items
* test results
* review points for Claude / ChatGPT

---

### Playwright (QA)

Responsibilities:

* UI testing
* mobile testing
* screenshot comparison
* reservation flow validation

Playwright validates:

* responsive UI
* CTA visibility
* booking flow
* visual regressions

---

# Repository Structure

```text
/docs/ai-orchestration/
00-master-context.md
01-product-brief.md
02-ux-rules.md
03-ui-design-rules.md
04-copy-rules.md
05-component-rules.md
06-v0-generation-rules.md
07-codex-implementation-rules.md
08-test-rules.md
09-review-checklist.md

/docs/ai-reports/
latest-implementation-report.md

/docs/design-system/
tokens
typography
spacing
components

/docs/ui-exploration/
uizard-output
concept-ui
```

---

# Workflow

## Standard Flow

1. ChatGPT reviews tasks and translates requirements.

2. Claude organizes UX and architecture if needed.

3. Uizard/v0 generate UI concepts.

4. Figma becomes official UI source.

5. Codex implements.

6. Playwright validates.

7. ChatGPT reviews PR + screenshots + reports.

8. Human only checks preview build.

## AI Communication Channels

AI agents must coordinate through:

* GitHub PR descriptions
* `docs/ai-reports/latest-implementation-report.md`
* CI and Playwright test results
* Vercel Preview URLs
* screenshots uploaded as workflow artifacts

AI agents must not require humans to relay implementation summaries between tools.

---

# Rules

## Never

* never depend on temporary chat memory
* never require humans to manually relay information between AIs
* never invent new design systems
* never ignore Figma
* never implement without reading orchestration rules

---

# Success Criteria

The system is successful when:

* AI sessions are replaceable
* Claude stopping does not stop development
* humans only perform final review
* implementation context exists entirely in GitHub
* AI coordination works asynchronously
