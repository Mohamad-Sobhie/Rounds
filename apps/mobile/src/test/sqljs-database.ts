import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

import type { Database, SqlValue } from '../data/database';

/** In-memory SQLite for tests, adapted to the app's `Database` interface. */
export async function createTestDatabase(): Promise<Database> {
  const SQL = await initSqlJs();
  const db: SqlJsDatabase = new SQL.Database();

  const all = <T>(source: string, params: SqlValue[]): T[] => {
    const statement = db.prepare(source);
    statement.bind(params);
    const rows: T[] = [];
    while (statement.step()) rows.push(statement.getAsObject() as T);
    statement.free();
    return rows;
  };

  return {
    execAsync: async (source) => void db.exec(source),
    runAsync: async (source, params) => void db.run(source, params),
    getAllAsync: async (source, params) => all(source, params),
    getFirstAsync: async (source, params) => all<never>(source, params)[0] ?? null,
    withTransactionAsync: async (task) => {
      // Like expo-sqlite, nesting is an error: BEGIN inside a transaction throws.
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
