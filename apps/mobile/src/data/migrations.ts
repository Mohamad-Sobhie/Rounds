import type { Database } from './database';

/**
 * Schema migrations, applied in order. The database's `user_version` records how many have run.
 * Never edit a migration after it has shipped; add a new one.
 */
export const migrations: readonly string[] = [
  `CREATE TABLE templates (
     id TEXT PRIMARY KEY NOT NULL,
     name TEXT NOT NULL,
     sort_order INTEGER NOT NULL,
     json TEXT NOT NULL,
     created_utc INTEGER NOT NULL,
     updated_utc INTEGER NOT NULL
   );`,
  `CREATE TABLE meta (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
];

export async function migrate(db: Database): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;
  for (let version = current; version < migrations.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migrations[version] as string);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
