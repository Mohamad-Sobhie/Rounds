import {
  apply,
  compile,
  type Clock,
  type EngineCommand,
  type RunState,
  type Template,
  type Timeline,
} from '@rounds/core';
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export interface ActiveWorkout {
  templateId: string;
  templateName: string;
  activity: Template['activity'];
  timeline: Timeline;
  runState: RunState | null;
}

export interface SessionState {
  workout: ActiveWorkout | null;
  /** Compiles a template and makes it the active workout, ready to start. */
  load: (template: Template) => void;
  /** The single entry point for engine commands. Stamps the command with the clock's time. */
  dispatch: (type: EngineCommand['type']) => void;
  clear: () => void;
}

/**
 * The active workout, persisted so a running session survives the app being killed: because the
 * engine derives position from timestamps, restoring the state is enough to resume correctly.
 */
export function createSessionStore(clock: Clock, storage: StateStorage) {
  return createStore<SessionState>()(
    persist(
      (set, get) => ({
        workout: null,

        load: (template) =>
          set({
            workout: {
              templateId: template.id,
              templateName: template.name,
              activity: template.activity,
              timeline: compile(template),
              runState: null,
            },
          }),

        dispatch: (type) => {
          const { workout } = get();
          if (!workout) return;
          const runState = apply(
            workout.runState,
            { type, atUtc: clock.nowUtc() },
            workout.timeline,
          );
          if (runState !== workout.runState) {
            set({ workout: { ...workout, runState } });
          }
        },

        clear: () => set({ workout: null }),
      }),
      {
        name: 'rounds.session',
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({ workout: state.workout }),
      },
    ),
  );
}

export type SessionStore = ReturnType<typeof createSessionStore>;
