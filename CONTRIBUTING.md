# Contributing

## Setup

See [Getting started](README.md#getting-started) in the README.

## Workflow

- Every change starts from a GitHub issue.
- One branch per issue, named `<type>/<issue>-<slug>`, e.g. `feat/6-timeline-compiler`.
- Open a pull request that says `Closes #<issue>` and fills in the template (what, why, how tested).
- PR titles follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(core): …`, `fix(ui): …`, `chore(ci): …`, `docs: …`.
- Pull requests are **squash-merged**, so the PR title becomes the commit on `main`. Commits inside a branch can be small and informal.
- CI (format, lint, typecheck, tests) must pass before merging.

## Code guidelines

- `packages/core` stays pure TypeScript: no React, React Native or Expo imports (enforced by ESLint). Anything time-dependent takes a clock as input.
- New behaviour in `packages/core` comes with unit tests.
- Significant technical decisions get a short ADR in [`docs/adr`](docs/adr).

## Secrets

Nothing secret is ever committed. Signing credentials and API keys live in EAS (Expo Application Services) secrets.
