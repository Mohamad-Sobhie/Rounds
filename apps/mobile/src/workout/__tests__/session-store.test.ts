import { evaluate, FakeClock, type Template } from '@rounds/core';
import type { StateStorage } from 'zustand/middleware';

import { createSessionStore } from '../session-store';

const template: Template = {
  id: 't1',
  name: 'Hill sprints',
  activity: 'treadmill',
  rounds: [
    {
      id: 'r1',
      blocks: [
        {
          id: 'b1',
          repeat: 2,
          steps: [
            { id: 's1', kind: 'work', durationSec: 60, label: 'Incline 6' },
            { id: 's2', kind: 'rest', durationSec: 30, label: 'Rest' },
          ],
        },
      ],
    },
  ],
};

function memoryStorage(): StateStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('session store', () => {
  it('loads a template as a compiled, not-yet-started workout', () => {
    const store = createSessionStore(new FakeClock(0), memoryStorage());
    store.getState().load(template);
    const { workout } = store.getState();
    expect(workout?.templateName).toBe('Hill sprints');
    expect(workout?.timeline.totalMs).toBe(150_000);
    expect(workout?.runState).toBeNull();
  });

  it('stamps commands with the clock time', () => {
    const clock = new FakeClock(1_000);
    const store = createSessionStore(clock, memoryStorage());
    store.getState().load(template);
    store.getState().dispatch('start');
    clock.advance(20_000);
    store.getState().dispatch('pause');
    expect(store.getState().workout?.runState).toEqual({
      startedAtUtc: 1_000,
      pausedAtUtc: 21_000,
      totalPausedMs: 0,
      seekMs: 0,
    });
  });

  it('ignores commands without a loaded workout', () => {
    const store = createSessionStore(new FakeClock(0), memoryStorage());
    store.getState().dispatch('start');
    expect(store.getState().workout).toBeNull();
  });

  it('restores a running workout after a restart at the correct position', async () => {
    const storage = memoryStorage();
    const clock = new FakeClock(0);
    const first = createSessionStore(clock, storage);
    first.getState().load(template);
    first.getState().dispatch('start');
    clock.advance(70_000);

    // App killed and relaunched: a fresh store over the same storage.
    const second = createSessionStore(clock, storage);
    await second.persist.rehydrate();
    const workout = second.getState().workout;
    expect(workout?.runState).not.toBeNull();
    if (!workout?.runState) return;
    const snapshot = evaluate(workout.runState, workout.timeline, clock.nowUtc());
    expect(snapshot).toMatchObject({ segmentIndex: 1, elapsedInSegmentMs: 10_000 });
  });

  it('clears the workout', () => {
    const store = createSessionStore(new FakeClock(0), memoryStorage());
    store.getState().load(template);
    store.getState().clear();
    expect(store.getState().workout).toBeNull();
  });
});
