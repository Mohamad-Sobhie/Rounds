# Rounds

[![CI](https://github.com/Mohamad-Sobhie/Rounds/actions/workflows/ci.yml/badge.svg)](https://github.com/Mohamad-Sobhie/Rounds/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A cardio interval timer built for use on a treadmill, bike or rower: big, glanceable cues on screen, and audio cues that keep working with the phone locked.

> Status: in development. Work is tracked in [GitHub issues](https://github.com/Mohamad-Sobhie/Rounds/issues) by milestone.

<p>
  <img src="docs/screenshots/workout-warmup.png" width="200" alt="Warm-up in progress" />
  <img src="docs/screenshots/workout-work.png" width="200" alt="Work interval with progress rings" />
  <img src="docs/screenshots/workout-rest.png" width="200" alt="Rest interval" />
  <img src="docs/screenshots/workout-paused.png" width="200" alt="Recovery between rounds, paused" />
</p>

## Features (planned for the first release)

- Templates made of rounds, blocks and steps, with per-step labels such as "Level 8" or "Incline 6"
- Quick routine: warm-up, work, rest, repeats and rounds without saving a template
- Full-screen workout view with phase colours, progress rings and a "next step" preview
- Countdown beeps, spoken announcements and vibration, with the screen locked, mixed with your music
- Local activity history with weekly to yearly charts
- Fully offline: no account, no backend

## Architecture

```
apps/mobile          Expo app: screens, state, native audio integration
  └── depends on
packages/core        Pure TypeScript: domain model, timeline compiler, timing engine, cue planning
```

A few principles drive the design:

- **Compile, then play.** A workout template is compiled into a flat, immutable timeline of segments. Everything at runtime reads from that timeline.
- **Time is derived, never counted.** The engine stores `{ startedAt, pausedAt, totalPausedMs, seekMs }` and computes the position from the current time. Nothing drifts when the app is backgrounded, and the UI only re-renders.
- **Commands as data.** Start, pause, resume and skip are timestamped commands applied to the state by a pure reducer. That keeps the engine fully testable with a fake clock and leaves room for group sessions later, where commands arrive over the network.

Design decisions are recorded in [`docs/adr`](docs/adr).

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
