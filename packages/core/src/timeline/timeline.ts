/** Bumped whenever the serialized shape of a timeline changes. */
export const TIMELINE_SCHEMA_VERSION = 1;

export type SegmentKind = 'warmup' | 'work' | 'rest' | 'recovery' | 'cooldown';

export interface Segment {
  index: number;
  kind: SegmentKind;
  label: string;
  /** Offset from the start of the workout. */
  startMs: number;
  durationMs: number;
  /** 1-based. Set on work, rest and recovery segments (recovery carries the round it follows). */
  roundNo?: number;
  /** 1-based count of work steps within the round. Rests carry the number of the preceding work. */
  intervalNo?: number;
  color?: string;
}

/**
 * A compiled workout: a flat, immutable, JSON-serializable list of segments.
 * Compiling the same template always produces an identical timeline.
 */
export interface Timeline {
  schemaVersion: number;
  segments: readonly Segment[];
  totalMs: number;
  roundCount: number;
  /** Number of intervals (work steps) per round, indexed by `roundNo - 1`. */
  intervalsPerRound: readonly number[];
}

/**
 * Index of the segment containing `positionMs`, or `-1` for an empty timeline.
 * A position exactly on a boundary belongs to the segment that starts there;
 * positions at or past the end resolve to the last segment.
 */
export function segmentIndexAt(timeline: Timeline, positionMs: number): number {
  const { segments } = timeline;
  if (segments.length === 0) return -1;

  let low = 0;
  let high = segments.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((segments[mid] as Segment).startMs <= positionMs) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
}

export function segmentEndMs(segment: Segment): number {
  return segment.startMs + segment.durationMs;
}
