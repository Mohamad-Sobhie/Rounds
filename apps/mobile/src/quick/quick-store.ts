import { defaultQuickRoutine, type QuickRoutine } from '@rounds/core';
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export interface QuickState {
  routine: QuickRoutine;
  set: (patch: Partial<QuickRoutine>) => void;
}

/** The quick start form, remembered between launches. */
export function createQuickStore(storage: StateStorage) {
  return createStore<QuickState>()(
    persist(
      (set) => ({
        routine: defaultQuickRoutine,
        set: (patch) => set((state) => ({ routine: { ...state.routine, ...patch } })),
      }),
      {
        name: 'rounds.quick',
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: ({ routine }) => ({ routine }),
        merge: (persisted, current) => ({
          ...current,
          routine: {
            ...current.routine,
            ...(persisted as Partial<QuickState> | undefined)?.routine,
          },
        }),
      },
    ),
  );
}
