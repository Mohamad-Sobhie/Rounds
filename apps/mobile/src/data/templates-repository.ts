import { duplicateTemplate, validateTemplate, type IdFactory, type Template } from '@rounds/core';

import type { Database } from './database';

interface TemplateRow {
  id: string;
  json: string;
}

/**
 * Templates are stored as validated JSON, in the same format used for export and import. Only the
 * fields needed for ordering and listing get their own columns.
 */
export class TemplatesRepository {
  constructor(
    private readonly db: Database,
    private readonly now: () => number = Date.now,
  ) {}

  async list(): Promise<Template[]> {
    const rows = await this.db.getAllAsync<TemplateRow>(
      'SELECT id, json FROM templates ORDER BY sort_order',
      [],
    );
    return rows.flatMap((row) => this.parse(row));
  }

  async get(id: string): Promise<Template | null> {
    const row = await this.db.getFirstAsync<TemplateRow>(
      'SELECT id, json FROM templates WHERE id = ?',
      [id],
    );
    return row ? (this.parse(row)[0] ?? null) : null;
  }

  /** Inserts a new template at the end of the list, or updates an existing one in place. */
  async save(template: Template): Promise<void> {
    const result = validateTemplate(template);
    if (!result.ok) {
      throw new Error(
        `Invalid template: ${result.issues.map((i) => `${i.path} ${i.message}`).join('; ')}`,
      );
    }
    const now = this.now();
    await this.db.runAsync(
      `INSERT INTO templates (id, name, sort_order, json, created_utc, updated_utc)
       VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM templates), ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, json = excluded.json, updated_utc = excluded.updated_utc`,
      [template.id, template.name, JSON.stringify(result.template), now, now],
    );
  }

  async remove(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
  }

  /** Saves a copy right after the original with a new id and "Copy of" name. */
  async duplicate(id: string, newId: IdFactory): Promise<Template | null> {
    const original = await this.get(id);
    if (!original) return null;
    const copy = duplicateTemplate(original, `${original.name} copy`, newId);
    await this.db.withTransactionAsync(async () => {
      await this.save(copy);
      await this.writeOrder(this.insertAfter(await this.ids(), id, copy.id));
    });
    return copy;
  }

  /** Rewrites the sort order to match `ids`. */
  async reorder(ids: readonly string[]): Promise<void> {
    await this.db.withTransactionAsync(() => this.writeOrder(ids));
  }

  private async writeOrder(ids: readonly string[]): Promise<void> {
    for (const [index, id] of ids.entries()) {
      await this.db.runAsync('UPDATE templates SET sort_order = ? WHERE id = ?', [index, id]);
    }
  }

  private async ids(): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ id: string }>(
      'SELECT id FROM templates ORDER BY sort_order',
      [],
    );
    return rows.map((row) => row.id);
  }

  private insertAfter(ids: string[], anchor: string, id: string): string[] {
    const rest = ids.filter((existing) => existing !== id);
    rest.splice(rest.indexOf(anchor) + 1, 0, id);
    return rest;
  }

  /** Rows that no longer validate (e.g. corrupted) are skipped rather than crashing the list. */
  private parse(row: TemplateRow): Template[] {
    try {
      const result = validateTemplate(JSON.parse(row.json));
      return result.ok ? [result.template] : [];
    } catch {
      return [];
    }
  }
}
