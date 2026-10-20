import { evaluate, type Clock, type Snapshot } from '@rounds/core';
import { useEffect, useState } from 'react';
import { useStore } from 'zustand';

import type { SessionStore } from './session-store';

/** How often the screen re-renders while running. Purely visual: timing never depends on it. */
const FRAME_MS = 100;

/** Evaluates the engine on every frame while running; returns null before the workout starts. */
export function useSnapshot(store: SessionStore, clock: Clock): Snapshot | null {
  const workout = useStore(store, (state) => state.workout);
  const [now, setNow] = useState(() => clock.nowUtc());

  const runState = workout?.runState;
  const isLive =
    runState != null && runState.pausedAtUtc === undefined && runState.stoppedAtUtc === undefined;

  useEffect(() => {
    const tick = () => setNow(clock.nowUtc());
    // Re-read the clock right after any state change (start, pause, skip), then on every frame.
    const immediate = setTimeout(tick, 0);
    const interval = isLive ? setInterval(tick, FRAME_MS) : undefined;
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [clock, isLive, runState]);

  if (!workout || !runState) return null;
  return evaluate(runState, workout.timeline, now);
}
