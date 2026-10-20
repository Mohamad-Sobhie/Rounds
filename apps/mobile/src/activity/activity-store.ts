import { createStore } from 'zustand/vanilla';

import type { ActivitiesRepository, ActivityRecord } from '../data/activities-repository';
import { summarize, type Range, type Summary } from './buckets';

export interface ActivityState {
  range: Range;
  summary: Summary | null;
  records: ActivityRecord[];
  setRange: (range: Range) => Promise<void>;
  refresh: () => Promise<void>;
  record: (record: ActivityRecord) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function createActivityStore(
  repository: () => Promise<ActivitiesRepository>,
  now: () => Date = () => new Date(),
) {
  return createStore<ActivityState>()((set, get) => ({
    range: 'week',
    summary: null,
    records: [],

    setRange: async (range) => {
      set({ range });
      await get().refresh();
    },

    refresh: async () => {
      const { range } = get();
      const empty = summarize([], range, now());
      const records = await (await repository()).between(empty.fromUtc, empty.toUtc);
      set({ records, summary: summarize(records, range, now()) });
    },

    record: async (record) => {
      await (await repository()).add(record);
      await get().refresh();
    },

    remove: async (id) => {
      await (await repository()).remove(id);
      await get().refresh();
    },
  }));
}

export type ActivityStore = ReturnType<typeof createActivityStore>;
