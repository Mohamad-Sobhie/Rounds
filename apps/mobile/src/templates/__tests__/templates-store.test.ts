import { validateTemplate } from '@rounds/core';

import { migrate } from '../../data/migrations';
import { TemplatesRepository } from '../../data/templates-repository';
import { createTestDatabase } from '../../test/sqljs-database';
import { sampleTemplates } from '../samples';
import { createTemplatesStore } from '../templates-store';

async function setup(firstRun = true) {
  const db = await createTestDatabase();
  await migrate(db);
  const repo = new TemplatesRepository(db);
  let seeded = !firstRun;
  let n = 0;
  const store = createTemplatesStore({
    repository: async () => repo,
    newId: () => `id-${++n}`,
    isFirstRun: async () => !seeded,
    markFirstRunDone: async () => {
      seeded = true;
    },
  });
  return store;
}

describe('templates store', () => {
  it('ships valid sample templates', () => {
    let n = 0;
    for (const t of sampleTemplates(() => `s-${++n}`)) expect(validateTemplate(t).ok).toBe(true);
  });

  it('seeds samples on first run only', async () => {
    const store = await setup(true);
    await store.getState().refresh();
    expect(store.getState().templates.map((t) => t.name)).toEqual([
      'Hill intervals',
      'Bike ladder',
      'Two-minute demo',
    ]);
    await store.getState().refresh();
    expect(store.getState().templates).toHaveLength(3);
  });

  it('seeds once even when refreshes overlap', async () => {
    const store = await setup(true);
    await Promise.all([store.getState().refresh(), store.getState().refresh()]);
    expect(store.getState().templates).toHaveLength(3);
  });

  it('does not seed when the user has run the app before', async () => {
    const store = await setup(false);
    await store.getState().refresh();
    expect(store.getState().templates).toEqual([]);
  });

  it('moves, duplicates and removes through the repository', async () => {
    const store = await setup(true);
    await store.getState().refresh();
    const [hill, bike] = store.getState().templates;
    await store.getState().move(bike!.id, -1);
    expect(store.getState().templates[0]?.name).toBe('Bike ladder');
    await store.getState().duplicate(hill!.id);
    expect(store.getState().templates.map((t) => t.name)).toEqual([
      'Bike ladder',
      'Hill intervals',
      'Hill intervals copy',
      'Two-minute demo',
    ]);
    await store.getState().remove(hill!.id);
    expect(store.getState().templates).toHaveLength(3);
  });
});
