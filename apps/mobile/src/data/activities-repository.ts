import type { ActivityType } from '@rounds/core';

import type { Database } from './database';

export type Outcome = 'completed' | 'stopped_early';

export interface ActivityRecord {
  /** `${templateId}:${startedUtc}`, so recording the same workout twice is a no-op. */
  id: string;
  templateId: string | null;
  templateName: string;
  activity: ActivityType;
  startedUtc: number;
  endedUtc: number;
  plannedMs: number;
  /** Time actually exercised: excludes pauses and skipped time. */
  activeMs: number;
  outcome: Outcome;
}

interface Row {
  id: string;
  template_id: string | null;
  template_name: string;
  activity_type: ActivityType;
  started_utc: number;
  ended_utc: number;
  planned_ms: number;
  active_ms: number;
  outcome: Outcome;
}

export class ActivitiesRepository {
  constructor(private readonly db: Database) {}

  /** Records a workout once; repeated calls for the same workout are ignored. */
  async add(record: ActivityRecord): Promise<void> {
    await this.db.runAsync(
      `INSERT OR IGNORE INTO activities
         (id, template_id, template_name, activity_type, started_utc, ended_utc, planned_ms, active_ms, outcome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.templateId,
        record.templateName,
        record.activity,
        record.startedUtc,
        record.endedUtc,
        Math.round(record.plannedMs),
        Math.round(record.activeMs),
        record.outcome,
      ],
    );
  }

  /** Workouts started in [fromUtc, toUtc), newest first. */
  async between(fromUtc: number, toUtc: number): Promise<ActivityRecord[]> {
    const rows = await this.db.getAllAsync<Row>(
      'SELECT * FROM activities WHERE started_utc >= ? AND started_utc < ? ORDER BY started_utc DESC',
      [fromUtc, toUtc],
    );
    return rows.map((row) => ({
      id: row.id,
      templateId: row.template_id,
      templateName: row.template_name,
      activity: row.activity_type,
      startedUtc: row.started_utc,
      endedUtc: row.ended_utc,
      plannedMs: row.planned_ms,
      activeMs: row.active_ms,
      outcome: row.outcome,
    }));
  }

  async remove(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM activities WHERE id = ?', [id]);
  }
}
