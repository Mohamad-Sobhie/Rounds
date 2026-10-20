import type { Template } from '@rounds/core';

import type { Database } from '../database';
import { migrate, migrations } from '../migrations';
import { TemplatesRepository } from '../templates-repository';
import { createTestDatabase } from '../../test/sqljs-database';

const template = (id: string, name = id): Template => ({
  id,
  name,
  activity: 'bike',
  rounds: [
    {
      id: `${id}-r`,
      blocks: [
        {
          id: `${id}-b`,
          repeat: 2,
          steps: [{ id: `${id}-s`, kind: 'work', durationSec: 30, label: 'Go' }],
        },
      ],
    },
  ],
});

let db: Database;
let repo: TemplatesRepository;
let ids: () => string;

beforeEach(async () => {
  db = await createTestDatabase();
  await migrate(db);
  repo = new TemplatesRepository(db, () => 1_000);
  let n = 0;
  ids = () => `new-${++n}`;
});

describe('migrate', () => {
  it('records the schema version and is idempotent', async () => {
    await migrate(db);
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
    expect(row?.user_version).toBe(migrations.length);
  });
});

describe('TemplatesRepository', () => {
  it('saves and lists templates in insertion order', async () => {
    await repo.save(template('a'));
    await repo.save(template('b'));
    expect((await repo.list()).map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('updates in place without changing the order', async () => {
    await repo.save(template('a'));
    await repo.save(template('b'));
    await repo.save(template('a', 'Renamed'));
    const list = await repo.list();
    expect(list.map((t) => [t.id, t.name])).toEqual([
      ['a', 'Renamed'],
      ['b', 'b'],
    ]);
  });

  it('round-trips a template exactly', async () => {
    const original = {
      ...template('a'),
      warmUp: { durationSec: 300, label: 'Easy' },
      recoverySec: 60,
    };
    await repo.save(original);
    expect(await repo.get('a')).toEqual(original);
  });

  it('rejects invalid templates', async () => {
    await expect(repo.save({ ...template('a'), rounds: [] })).rejects.toThrow('Invalid template');
  });

  it('removes templates', async () => {
    await repo.save(template('a'));
    await repo.remove('a');
    expect(await repo.list()).toEqual([]);
    expect(await repo.get('a')).toBeNull();
  });

  it('reorders', async () => {
    for (const id of ['a', 'b', 'c']) await repo.save(template(id));
    await repo.reorder(['c', 'a', 'b']);
    expect((await repo.list()).map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('duplicates right after the original with fresh ids', async () => {
    for (const id of ['a', 'b']) await repo.save(template(id, id.toUpperCase()));
    const copy = await repo.duplicate('a', ids);
    expect(copy?.name).toBe('A copy');
    expect((await repo.list()).map((t) => t.name)).toEqual(['A', 'A copy', 'B']);
    expect(copy?.rounds[0]?.id).not.toBe('a-r');
  });

  it('skips rows that no longer parse instead of failing the whole list', async () => {
    await repo.save(template('a'));
    await db.runAsync(
      "INSERT INTO templates (id, name, sort_order, json, created_utc, updated_utc) VALUES ('bad', 'Bad', 5, '{', 0, 0)",
      [],
    );
    expect((await repo.list()).map((t) => t.id)).toEqual(['a']);
  });
});
