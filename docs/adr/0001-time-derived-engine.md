# 0001. Derive workout position from the clock instead of counting ticks

- Status: accepted
- Date: 2026-10-20

## Context

An interval timer has to be accurate to well under a second over a 30–60 minute workout, while the
phone is locked, the app is suspended by the OS, or the JavaScript thread is busy. Group sessions
are planned for later: several phones in different countries must show the same step at the same
moment, controlled by the host.

The common approach is a countdown driven by a timer: decrement "seconds left" every tick. Timers
drift, stop firing when the app is suspended, and each device accumulates its own error, so
positions diverge.

## Decision

1. A template is compiled into an immutable, deterministic **timeline** of segments with absolute
   start offsets in integer milliseconds.
2. The engine state is plain data: `{ startedAtUtc, pausedAtUtc?, totalPausedMs, seekMs, stoppedAtUtc? }`.
   The position is always computed as `now - startedAt - totalPaused + seekMs`. Nothing is
   decremented, and the UI tick exists only to re-render.
3. Every change is a **timestamped command** (`start`, `pause`, `resume`, `skipForward`, `skipBack`,
   `stop`) applied by a pure reducer at the command's own `atUtc`, not at the time it is processed.
4. The current time comes from an injected `Clock`.

## Alternatives considered

- **Tick counter.** Simple, but drifts, breaks under suspension, and can't be synchronized.
- **Native timers per segment.** Accurate, but puts business logic in two native codebases and
  makes skip/pause logic hard to test.
- **Folding skips into `startedAt`.** Removes a field, but then "time actually exercised" can no
  longer be computed for the activity log. A separate `seekMs` keeps active time and position apart.

## Consequences

- Correct after any amount of suspension: resuming the app just evaluates the state at the new time.
- The engine is fully unit-testable with a fake clock, including hour-long jumps.
- Group sessions become a transport problem: share the timeline once, forward commands, and align
  clocks (NTP offset implementing `Clock`). Every device computes the same position.
- Invalid or duplicate commands are ignored rather than thrown, because they may arrive late or
  twice from a network.
