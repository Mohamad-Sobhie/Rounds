export type SqlValue = string | number | null;

/**
 * The subset of `expo-sqlite`'s `SQLiteDatabase` the app uses. Repositories depend on this
 * interface, so tests can run them against an in-memory SQLite (sql.js) in Node.
 */
export interface Database {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
