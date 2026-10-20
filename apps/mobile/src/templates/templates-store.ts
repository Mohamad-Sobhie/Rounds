import type { IdFactory, Template } from '@rounds/core';
import { createStore } from 'zustand/vanilla';

import type { TemplatesRepository } from '../data/templates-repository';
import { sampleTemplates } from './samples';

export interface TemplatesState {
  templates: Template[];
  loaded: boolean;
  refresh: () => Promise<void>;
  save: (template: Template) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  move: (id: string, delta: number) => Promise<void>;
}

interface Options {
  repository: () => Promise<TemplatesRepository>;
  newId: IdFactory;
  /** Seeds sample templates the very first time the app runs. */
  isFirstRun: () => Promise<boolean>;
  markFirstRunDone: () => Promise<void>;
}

/** In-memory view of the saved templates; every change goes through the repository first. */
export function createTemplatesStore({ repository, newId, isFirstRun, markFirstRunDone }: Options) {
  // Shared so overlapping refreshes (e.g. two screens focusing) seed only once.
  let seeding: Promise<void> | undefined;

  return createStore<TemplatesState>()((set, get) => {
    const reload = async () => {
      const repo = await repository();
      set({ templates: await repo.list(), loaded: true });
    };

    return {
      templates: [],
      loaded: false,

      refresh: async () => {
        seeding ??= (async () => {
          if (!(await isFirstRun())) return;
          const repo = await repository();
          for (const template of sampleTemplates(newId)) await repo.save(template);
          await markFirstRunDone();
        })();
        await seeding;
        await reload();
      },

      save: async (template) => {
        await (await repository()).save(template);
        await reload();
      },

      remove: async (id) => {
        await (await repository()).remove(id);
        await reload();
      },

      duplicate: async (id) => {
        await (await repository()).duplicate(id, newId);
        await reload();
      },

      move: async (id, delta) => {
        const ids = get().templates.map((t) => t.id);
        const from = ids.indexOf(id);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= ids.length) return;
        ids.splice(to, 0, ...ids.splice(from, 1));
        await (await repository()).reorder(ids);
        await reload();
      },
    };
  });
}

export type TemplatesStore = ReturnType<typeof createTemplatesStore>;
