import { formatClock, totalDurationMs, type ActivityType, type Template } from '@rounds/core';

export const activityNames: Record<ActivityType, string> = {
  treadmill: 'Treadmill',
  bike: 'Bike',
  rower: 'Rower',
  run: 'Run',
  other: 'Other',
};

/** One-line summary for lists, e.g. "Treadmill · 3 rounds · 27:30". */
export function describeTemplate(template: Template): string {
  const rounds = template.rounds.length;
  return [
    activityNames[template.activity],
    `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`,
    formatClock(totalDurationMs(template)),
  ].join(' · ');
}
