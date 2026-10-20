import { apply, compile, type RunState, type Template } from '@rounds/core';

import { ActivitiesRepository, type ActivityRecord } from '../../data/activities-repository';
import { migrate } from '../../data/migrations';
import { createTestDatabase } from '../../test/sqljs-database';
import type { ActiveWorkout } from '../../workout/session-store';
import { bucketsFor, formatTotal, summarize } from '../buckets';
import { activityRecordFor } from '../record';

const template: Template = {
  id: 't1',
  name: 'Intervals',
  activity: 'rower',
  rounds: [
    {
      id: 'r',
      blocks: [
        { id: 'b', repeat: 1, steps: [{ id: 's', kind: 'work', durationSec: 100, label: 'Go' }] },
      ],
    },
  ],
};
const timeline = compile(template);
const workout = (runState: RunState | null): ActiveWorkout => ({
  templateId: 't1',
  templateName: 'Intervals',
  activity: 'rower',
  timeline,
  runState,
});

describe('activityRecordFor', () => {
  const started: RunState = { startedAtUtc: 1_000, totalPausedMs: 0, seekMs: 0 };

  it('is null before starting or while running', () => {
    expect(activityRecordFor(workout(null), 5_000)).toBeNull();
    expect(activityRecordFor(workout(started), 50_000)).toBeNull();
  });

  it('records a completed workout at its real end time', () => {
    expect(activityRecordFor(workout(started), 10_000_000)).toEqual({
      id: 't1:1000',
      templateId: 't1',
      templateName: 'Intervals',
      activity: 'rower',
      startedUtc: 1_000,
      endedUtc: 101_000,
      plannedMs: 100_000,
      activeMs: 100_000,
      outcome: 'completed',
    });
  });

  it('records a stopped workout as stopped early with its active time', () => {
    const stopped = apply(started, { type: 'stop', atUtc: 31_000 }, timeline);
    expect(activityRecordFor(workout(stopped), 10_000_000)).toMatchObject({
      endedUtc: 31_000,
      activeMs: 30_000,
      outcome: 'stopped_early',
    });
  });

  it('counts skipping to the end as completed, with only the time actually exercised', () => {
    const skipped = apply(started, { type: 'skipForward', atUtc: 21_000 }, timeline);
    expect(activityRecordFor(workout(skipped), 10_000_000)).toMatchObject({
      outcome: 'completed',
      activeMs: 20_000,
    });
  });
});

describe('ActivitiesRepository', () => {
  const record = (id: string, startedUtc: number, activeMs = 60_000): ActivityRecord => ({
    id,
    templateId: 't1',
    templateName: 'Intervals',
    activity: 'rower',
    startedUtc,
    endedUtc: startedUtc + activeMs,
    plannedMs: 60_000,
    activeMs,
    outcome: 'completed',
  });

  it('stores records once and lists them newest first within a range', async () => {
    const db = await createTestDatabase();
    await migrate(db);
    const repo = new ActivitiesRepository(db);
    await repo.add(record('a', 100));
    await repo.add(record('a', 100));
    await repo.add(record('b', 200));
    await repo.add(record('c', 900));
    expect((await repo.between(0, 500)).map((r) => r.id)).toEqual(['b', 'a']);
    await repo.remove('b');
    expect((await repo.between(0, 1000)).map((r) => r.id)).toEqual(['c', 'a']);
  });
});

describe('bucketing', () => {
  const now = new Date(2026, 9, 21, 15, 30); // Wed 21 Oct 2026, local time

  it('builds the last 7 days ending today', () => {
    const buckets = bucketsFor('week', now);
    expect(buckets).toHaveLength(7);
    expect(buckets.map((b) => b.label)).toEqual(['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed']);
    expect(buckets.at(-1)?.startUtc).toBe(+new Date(2026, 9, 21));
  });

  it('builds 26 Monday-based weeks for 6 months', () => {
    const buckets = bucketsFor('6m', now);
    expect(buckets).toHaveLength(26);
    expect(new Date(buckets.at(-1)?.startUtc ?? 0).getDay()).toBe(1);
  });

  it('builds calendar months for 12 months and the current year', () => {
    expect(bucketsFor('12m', now).map((b) => b.label)).toEqual([
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
    ]);
    expect(bucketsFor('year', now)[0]?.startUtc).toBe(+new Date(2026, 0, 1));
  });

  it('sums active time per bucket and in total, ignoring workouts outside the range', () => {
    const today = +new Date(2026, 9, 21, 7);
    const yesterday = +new Date(2026, 9, 20, 18);
    const lastMonth = +new Date(2026, 8, 1);
    const records = [today, today + 3_600_000, yesterday, lastMonth].map((startedUtc, i) => ({
      id: String(i),
      templateId: null,
      templateName: 'x',
      activity: 'bike' as const,
      startedUtc,
      endedUtc: startedUtc,
      plannedMs: 0,
      activeMs: 600_000,
      outcome: 'completed' as const,
    }));
    const summary = summarize(records, 'week', now);
    expect(summary.count).toBe(3);
    expect(summary.activeMs).toBe(1_800_000);
    expect(summary.buckets.map((b) => b.activeMs / 60_000)).toEqual([0, 0, 0, 0, 0, 10, 20]);
  });

  it.each([
    [45 * 60_000, '45 min'],
    [65 * 60_000, '1 h 05 min'],
    [0, '0 s'],
    [11_000, '11 s'],
  ])('formats %i ms as "%s"', (ms, text) => {
    expect(formatTotal(ms)).toBe(text);
  });
});
