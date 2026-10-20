import type { ActivityRecord } from '../data/activities-repository';

export type Range = 'week' | 'month' | '6m' | '12m' | 'year';

export interface Bucket {
  label: string;
  startUtc: number;
  endUtc: number;
  activeMs: number;
}

export interface Summary {
  buckets: Bucket[];
  fromUtc: number;
  toUtc: number;
  count: number;
  activeMs: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
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
  'Nov',
  'Dec',
];

/** Time buckets for a range, in the device's local time, ending with the bucket containing `now`. */
export function bucketsFor(range: Range, now: Date): Omit<Bucket, 'activeMs'>[] {
  const today = startOfDay(now);
  switch (range) {
    case 'week':
      return days(today, 7, (d) => DAY_NAMES[d.getDay()] ?? '');
    case 'month':
      return days(today, 30, (d) => String(d.getDate()));
    case '6m': {
      const thisWeek = addDays(today, -((today.getDay() + 6) % 7)); // Monday
      return Array.from({ length: 26 }, (_, i) => {
        const start = addDays(thisWeek, (i - 25) * 7);
        return {
          label: `${MONTH_NAMES[start.getMonth()]} ${start.getDate()}`,
          startUtc: +start,
          endUtc: +addDays(start, 7),
        };
      });
    }
    case '12m':
      return months(new Date(now.getFullYear(), now.getMonth() - 11, 1), 12);
    case 'year':
      return months(new Date(now.getFullYear(), 0, 1), 12);
  }
}

/** Totals for the range plus per-bucket active time, for the chart. */
export function summarize(records: readonly ActivityRecord[], range: Range, now: Date): Summary {
  const buckets = bucketsFor(range, now).map((b) => ({ ...b, activeMs: 0 }));
  const fromUtc = buckets[0]?.startUtc ?? 0;
  const toUtc = buckets.at(-1)?.endUtc ?? 0;
  let count = 0;
  let activeMs = 0;
  for (const record of records) {
    const bucket = buckets.find(
      (b) => record.startedUtc >= b.startUtc && record.startedUtc < b.endUtc,
    );
    if (!bucket) continue;
    bucket.activeMs += record.activeMs;
    count++;
    activeMs += record.activeMs;
  }
  return { buckets, fromUtc, toUtc, count, activeMs };
}

/** "40 s", "45 min", "1 h 05 min". */
export function formatTotal(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

function days(today: Date, count: number, label: (d: Date) => string) {
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(today, i - (count - 1));
    return { label: label(start), startUtc: +start, endUtc: +addDays(start, 1) };
  });
}

function months(first: Date, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(first.getFullYear(), first.getMonth() + i, 1);
    const end = new Date(first.getFullYear(), first.getMonth() + i + 1, 1);
    return { label: MONTH_NAMES[start.getMonth()] ?? '', startUtc: +start, endUtc: +end };
  });
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Calendar-day arithmetic in local time, so DST changes don't shift bucket boundaries. */
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
