import { openDatabaseAsync } from 'expo-sqlite';

import type { Database } from './database';
import { migrate } from './migrations';

let opening: Promise<Database> | undefined;

/** The app's database, opened and migrated once. */
export function getDatabase(): Promise<Database> {
  opening ??= (async () => {
    const db = await openDatabaseAsync('rounds.db');
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await migrate(db);
    return db;
  })();
  return opening;
}
