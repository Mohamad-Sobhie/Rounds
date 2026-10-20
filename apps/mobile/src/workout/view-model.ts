import {
  formatClock,
  type RunStatus,
  type SegmentKind,
  type Snapshot,
  type Timeline,
} from '@rounds/core';

/** Everything the workout screen displays, as plain strings. */
export interface WorkoutView {
  status: RunStatus | 'ready';
  phase: SegmentKind;
  label: string;
  countdown: string;
  /** e.g. "Rest 0:25"; null on the last segment. */
  next: string | null;
  /** e.g. "2/3"; null outside rounds (warm-up, cooldown). */
  round: string | null;
  /** e.g. "3/8"; null when the segment has no interval number. */
  interval: string | null;
  remaining: string;
}

/** Derives the screen's text from the engine snapshot, or the first segment before starting. */
export function workoutView(timeline: Timeline, snapshot: Snapshot | null): WorkoutView {
  const index = snapshot?.segmentIndex ?? 0;
  const segment = timeline.segments[index];
  if (!segment) throw new Error('Timeline has no segments');
  const nextSegment = timeline.segments[index + 1];

  const round = segment.roundNo;
  const intervals = round === undefined ? undefined : timeline.intervalsPerRound[round - 1];

  return {
    status: snapshot?.status ?? 'ready',
    phase: segment.kind,
    label: segment.label,
    countdown: formatClock(snapshot?.remainingInSegmentMs ?? segment.durationMs),
    next: nextSegment ? `${nextSegment.label} ${formatClock(nextSegment.durationMs)}` : null,
    round: round === undefined ? null : `${round}/${timeline.roundCount}`,
    interval:
      segment.intervalNo === undefined || intervals === undefined
        ? null
        : `${segment.intervalNo}/${intervals}`,
    remaining: formatClock(snapshot?.totalRemainingMs ?? timeline.totalMs),
  };
}
