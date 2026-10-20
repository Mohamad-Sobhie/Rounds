# Rounds

Cardio interval timer for iOS and Android. Built with React Native (Expo).

Work is tracked in [GitHub issues](https://github.com/Mohamad-Sobhie/Rounds/issues) by milestone.

## Repository layout

| Path            | What                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `packages/core` | Domain model, timeline compiler and timing engine. Pure TypeScript, no React Native, unit-tested with Vitest. |
| `apps/mobile`   | Expo app (Expo Router, development builds).                                                                   |

## Getting started

Requirements: Node 24 LTS (see `.node-version`), pnpm via Corepack, Xcode for iOS builds.

```bash
corepack enable
pnpm install
pnpm test        # all workspaces
pnpm typecheck
pnpm lint
```

Run the app in the iOS simulator (builds a development client the first time):

```bash
pnpm --filter @rounds/mobile ios
```
