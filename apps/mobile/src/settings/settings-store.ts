import { defaultCueSettings, type CueSettings } from '@rounds/core';
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export interface Settings {
  cues: CueSettings;
  /** Vibrate on every step change while the app is open. */
  vibration: boolean;
  /** Cue volume relative to the system volume, 0..1. */
  volume: number;
}

export const defaultSettings: Settings = {
  cues: defaultCueSettings,
  vibration: true,
  volume: 1,
};

export interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  updateCues: (patch: Partial<CueSettings>) => void;
}

export function createSettingsStore(storage: StateStorage) {
  return createStore<SettingsState>()(
    persist(
      (set) => ({
        ...defaultSettings,
        update: (patch) => set(patch),
        updateCues: (patch) => set((state) => ({ cues: { ...state.cues, ...patch } })),
      }),
      {
        name: 'rounds.settings',
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: ({ cues, vibration, volume }) => ({ cues, vibration, volume }),
        // New cue options added later get their defaults instead of `undefined`.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<Settings>;
          return { ...current, ...saved, cues: { ...current.cues, ...saved.cues } };
        },
      },
    ),
  );
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
