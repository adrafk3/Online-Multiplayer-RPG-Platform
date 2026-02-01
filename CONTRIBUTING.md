# Contributing to Online Multiplayer RPG Platform

Thank you for your interest in contributing. This document outlines the workflow, conventions, and practices we use to keep the codebase consistent and maintainable.

---

## Table of Contents

- [Branch Strategy](#branch-strategy)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Merge Requests](#merge-requests)
- [Code Review](#code-review)
- [Coding Standards](#coding-standards)
- [Running Checks Before Submitting](#running-checks-before-submitting)

---

## Branch Strategy

- **`main`** — Production-ready code. Protected; updates only via merge requests.
- **`dev`** (or **`develop`**) — Integration branch for features and fixes. Keep it in sync with `main` and use it as the base for most work.
- **Feature / fix branches** — Created from `dev` (or `main` when appropriate). One logical change per branch.

**Workflow:**

1. Create a new branch from `dev` for your change.
2. Implement, commit, and push.
3. Open a Merge Request (MR) targeting `dev` (or `main` if your workflow specifies).
4. After review and approval, merge. Do not merge if the CI pipeline has failed.

---

## Branch Naming

Use lowercase with slashes. Be concise and descriptive.

| Type          | Pattern               | Example                     |
| ------------- | --------------------- | --------------------------- |
| Feature       | `feature/short-name`  | `feature/ctf-flag-logic`    |
| Bug fix       | `hotfix/short-name`   | `hotfix/combat-timer-crash` |
| Refactor      | `refactor/short-name` | `refactor/socket-events`    |
| Documentation | `docs/short-name`     | `docs/readme-api`           |

---

## Commit Messages

- **Language:** English.
- **Length:** One short line (about 50–72 characters) for the subject; add a body only when you need to explain _why_ or give context.
- **Tone:** Imperative (“Add feature” not “Added feature”).
- **Scope (optional):** Prefix with area, e.g. `client:`, `server:`, `common:`.

**Examples:**

```
Add turn timeout handling in game logic gateway
Fix socket reconnection when server restarts
client: align player panel with new stats API
server: validate map size in board controller
```

**What to avoid:**

- Vague messages: “Fix bug”, “Update code”, “WIP”.
- Messages that only reference a ticket without describing the change: “LOG-123”.

---

## Merge Requests

1. **Target branch** — Usually `dev` (or `develop`). Use `main` only when your workflow requires it (e.g. release).
2. **Title** — Clear and descriptive; can mirror the main commit message.
3. **Description** — Briefly state what changed and why. Link related issues or MRs if applicable.
4. **CI** — Ensure the pipeline (install, lint, test) passes. Fix any failure before requesting review.
5. **Size** — Prefer smaller, focused MRs. Split large features into logical steps when possible.

Do not merge a Merge Request whose pipeline has failed. Resolve failures and re-run the pipeline before merging.

---

## Code Review

- Reviewers focus on correctness, clarity, tests, and alignment with [Coding Standards](#coding-standards).
- Authors address comments by pushing new commits to the same branch (no need to squash unless the team prefers it).
- Keep feedback constructive and specific.

---

## Coding Standards

- **Language:** Code, comments, and user-facing strings: **English** (unless product requirements state otherwise).
- **Linting:** ESLint and Prettier are configured. Run `npm run lint` and `npm run lint:fix` in both `client/` and `server/` and fix reported issues.
- **Naming:**
    - **Constants:** `UPPER_SNAKE_CASE`
    - **Types / Enums / Classes:** `PascalCase`
    - **Functions, variables, properties:** `camelCase`
    - **Angular component selectors / file names:** `kebab-case`
- **TypeScript:** Prefer `const` and `let`; avoid `var`. Avoid `any`; use proper types or generics. Explicit return types on non-trivial functions.
- **Structure:** Prefer small, single-responsibility functions and modules. Avoid magic numbers and magic strings; use named constants.
- **Duplication:** Do not copy-paste logic; extract shared code into services, utilities, or shared modules as appropriate.
- **Tests:** New or changed behavior should be covered by unit tests. Run `npm test` and `npm run coverage` in both `client/` and `server/` before submitting.

For detailed lint rules, see `.eslintrc.json` in each project and the root Prettier configuration.

---

## Running Checks Before Submitting

From the repository root:

**Client**

```bash
cd client
npm ci
npm run lint
npm test
npm run coverage   # optional
```

**Server**

```bash
cd server
npm ci
npm run lint
npm test
npm run coverage   # optional
```

Fix any lint or test failures before opening or updating a Merge Request. This keeps the CI pipeline green and the codebase stable.

---

If you have questions, open an issue or reach out to the maintainers. Thank you for contributing.
