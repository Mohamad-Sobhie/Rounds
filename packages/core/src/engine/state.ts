import type { Segment } from '../timeline';

/**
 * Engine state. Plain data, JSON-serializable, all timestamps UTC epoch ms.
 *
 * Nothing here is decremented over time: the position is always derived from the clock.
 * - active time = now - startedAt - totalPaused   (time actually spent exercising)
 * - position    = active time + seekMs             (where we are in the timeline)
 */
export interface RunState {
  startedAtUtc: number;
  pausedAtUtc?: number;
  totalPausedMs: number;
  /** Net adjustment from skips, in ms. Positive after skipping forward. */
  seekMs: number;
  stoppedAtUtc?: number;
}

/**
 * Every change to the engine is a timestamped command. Commands are applied at `atUtc`, not when
 * they are received, so the same command produces the same state on every device.
 */
export type EngineCommand =
  | { type: 'start'; atUtc: number }
  | { type: 'pause'; atUtc: number }
  | { type: 'resume'; atUtc: number }
  | { type: 'skipForward'; atUtc: number }
  | { type: 'skipBack'; atUtc: number }
  | { type: 'stop'; atUtc: number };

export type RunStatus = 'running' | 'paused' | 'finished' | 'stopped';

export interface Snapshot {
  status: RunStatus;
  segmentIndex: number;
  segment: Segment;
  elapsedInSegmentMs: number;
  remainingInSegmentMs: number;
  /** Position in the timeline, including skips. */
  positionMs: number;
  totalRemainingMs: number;
  /** Time actually spent exercising: excludes pauses and skipped time. */
  activeMs: number;
  /** 0..1 */
  segmentProgress: number;
  /** 0..1 */
  totalProgress: number;
}
