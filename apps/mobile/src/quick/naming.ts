import { formatClock, type QuickRoutine } from '@rounds/core';

/** A readable default name, e.g. "8 × 1:00 / 0:30" or "3 rounds of 8 × 1:00 / 0:30". */
export function quickRoutineName(q: QuickRoutine): string {
  const set = `${q.repeat} × ${formatClock(q.workSec * 1000)}${q.restSec > 0 ? ` / ${formatClock(q.restSec * 1000)}` : ''}`;
  return q.rounds > 1 ? `${q.rounds} rounds of ${set}` : set;
}

/** Coarser steps for longer durations: 5 s under a minute, 15 s under five, then 30 s. */
export function durationStep(seconds: number): number {
  if (seconds < 60) return 5;
  if (seconds < 300) return 15;
  return 30;
}
