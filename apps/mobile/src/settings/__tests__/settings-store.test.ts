import { defaultCueSettings } from '@rounds/core';
import type { StateStorage } from 'zustand/middleware';

import { createSettingsStore, defaultSettings } from '../settings-store';

function memoryStorage(initial: Record<string, string> = {}): StateStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('settings store', () => {
  it('starts with the defaults', () => {
    const store = createSettingsStore(memoryStorage());
    expect(store.getState()).toMatchObject(defaultSettings);
  });

  it('updates individual cue options without touching the others', () => {
    const store = createSettingsStore(memoryStorage());
    store.getState().updateCues({ announceRest: false });
    expect(store.getState().cues).toEqual({ ...defaultCueSettings, announceRest: false });
  });

  it('fills in cue options that did not exist when the settings were saved', async () => {
    const saved = JSON.stringify({
      state: { cues: { beeps: false }, vibration: false, volume: 0.5 },
      version: 1,
    });
    const store = createSettingsStore(memoryStorage({ 'rounds.settings': saved }));
    await store.persist.rehydrate();
    expect(store.getState()).toMatchObject({
      cues: { ...defaultCueSettings, beeps: false },
      vibration: false,
      volume: 0.5,
    });
  });
});
