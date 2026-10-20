import { defaultQuickRoutine } from '@rounds/core';
import type { StateStorage } from 'zustand/middleware';

import { durationStep, quickRoutineName } from '../naming';
import { createQuickStore } from '../quick-store';

describe('quickRoutineName', () => {
  it('names single and multi-round routines', () => {
    expect(quickRoutineName(defaultQuickRoutine)).toBe('8 × 1:00 / 0:30');
    expect(quickRoutineName({ ...defaultQuickRoutine, rounds: 3, restSec: 0 })).toBe(
      '3 rounds of 8 × 1:00',
    );
  });
});

describe('durationStep', () => {
  it.each([
    [10, 5],
    [59, 5],
    [60, 15],
    [299, 15],
    [300, 30],
  ])('%i s steps by %i s', (seconds, step) => {
    expect(durationStep(seconds)).toBe(step);
  });
});

describe('quick store', () => {
  it('remembers the last routine', async () => {
    const data = new Map<string, string>();
    const storage: StateStorage = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
    createQuickStore(storage).getState().set({ workSec: 45, repeat: 10 });
    const reopened = createQuickStore(storage);
    await reopened.persist.rehydrate();
    expect(reopened.getState().routine).toMatchObject({ workSec: 45, repeat: 10, restSec: 30 });
  });
});
