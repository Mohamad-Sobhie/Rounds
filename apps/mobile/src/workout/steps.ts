import type { Segment, Timeline } from '@rounds/core';

export type StepRow =
  | { type: 'header'; key: string; title: string }
  | { type: 'segment'; key: string; segment: Segment };

/** Flattens the timeline into rows with a header before each round (and recovery/warm-up/cooldown). */
export function stepRows(timeline: Timeline): StepRow[] {
  const rows: StepRow[] = [];
  let group: string | null = null;
  for (const segment of timeline.segments) {
    const title = groupTitle(segment, timeline.roundCount);
    if (title !== group) {
      rows.push({ type: 'header', key: `h${segment.index}`, title });
      group = title;
    }
    rows.push({ type: 'segment', key: `s${segment.index}`, segment });
  }
  return rows;
}

function groupTitle(segment: Segment, roundCount: number): string {
  switch (segment.kind) {
    case 'warmup':
      return 'Warm-up';
    case 'cooldown':
      return 'Cooldown';
    case 'recovery':
      return 'Recovery';
    default:
      return `Round ${segment.roundNo ?? 1} of ${roundCount}`;
  }
}
