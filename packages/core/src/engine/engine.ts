import { segmentEndMs, segmentIndexAt, type Segment, type Timeline } from '../timeline';
import type { EngineCommand, RunState, RunStatus, Snapshot } from './state';

/**
 * Within this much of a segment's start, "skip back" goes to the previous segment instead of
 * restarting the current one.
 */
export const SKIP_BACK_GRACE_MS = 3000;

/**
 * Pure reducer: applies a command to the state. Commands that don't make sense in the current
 * state (pausing while paused, anything after stop) are ignored rather than thrown, because they
 * may arrive late or duplicated from other sources.
 */
export function apply(
  state: RunState | null,
  command: EngineCommand,
  timeline: Timeline,
): RunState | null {
  const at = command.atUtc;

  if (!state) {
    return command.type === 'start' ? { startedAtUtc: at, totalPausedMs: 0, seekMs: 0 } : null;
  }
  if (state.stoppedAtUtc !== undefined) return state;

  switch (command.type) {
    case 'start':
      return state;

    case 'stop':
      return { ...state, stoppedAtUtc: at };

    case 'pause':
      if (state.pausedAtUtc !== undefined || isFinishedAt(state, timeline, at)) return state;
      return { ...state, pausedAtUtc: at };

    case 'resume': {
      if (state.pausedAtUtc === undefined) return state;
      const { pausedAtUtc, ...rest } = state;
      return { ...rest, totalPausedMs: state.totalPausedMs + Math.max(0, at - pausedAtUtc) };
    }

    case 'skipForward':
    case 'skipBack': {
      if (isFinishedAt(state, timeline, at)) return state;
      const position = rawPositionAt(state, at);
      const target =
        command.type === 'skipForward'
          ? skipForwardTarget(timeline, position)
          : skipBackTarget(timeline, position);
      return { ...state, seekMs: state.seekMs + (target - position) };
    }
  }
}

/** Pure query: where the workout is at `nowUtc`. */
export function evaluate(state: RunState, timeline: Timeline, nowUtc: number): Snapshot {
  const { totalMs } = timeline;
  const raw = rawPositionAt(state, nowUtc);
  const positionMs = clamp(raw, 0, totalMs);
  const finished = raw >= totalMs;

  const segmentIndex = segmentIndexAt(timeline, finished ? totalMs : positionMs);
  const segment = timeline.segments[segmentIndex] as Segment;
  const elapsedInSegmentMs = clamp(positionMs - segment.startMs, 0, segment.durationMs);

  return {
    status: statusOf(state, finished),
    segmentIndex,
    segment,
    elapsedInSegmentMs,
    remainingInSegmentMs: segment.durationMs - elapsedInSegmentMs,
    positionMs,
    totalRemainingMs: totalMs - positionMs,
    // Active time stops accruing once the end of the timeline is reached.
    activeMs: clamp(activeAt(state, nowUtc), 0, Math.max(0, totalMs - state.seekMs)),
    segmentProgress: segment.durationMs === 0 ? 1 : elapsedInSegmentMs / segment.durationMs,
    totalProgress: totalMs === 0 ? 1 : positionMs / totalMs,
  };
}

/**
 * When the workout ended, in UTC ms, or null if it hasn't. A workout ends when it is stopped or
 * when its position reaches the end of the timeline, which may be long before anyone looks
 * (e.g. it finished while the app was in the background).
 */
export function endedAtUtc(state: RunState, timeline: Timeline, nowUtc: number): number | null {
  if (state.stoppedAtUtc !== undefined) {
    const naturalEnd = naturalEndUtc(state, timeline);
    return naturalEnd !== null && naturalEnd < state.stoppedAtUtc ? naturalEnd : state.stoppedAtUtc;
  }
  const naturalEnd = naturalEndUtc(state, timeline);
  return naturalEnd !== null && naturalEnd <= nowUtc ? naturalEnd : null;
}

/**
 * When the position reaches the end if nothing else happens. Null while paused: a pause can only
 * start before the end (the reducer ignores it afterwards), so a paused workout hasn't ended.
 */
function naturalEndUtc(state: RunState, timeline: Timeline): number | null {
  if (state.pausedAtUtc !== undefined) return null;
  return state.startedAtUtc + state.totalPausedMs + timeline.totalMs - state.seekMs;
}

/** The moment time stops for this state: when it was paused or stopped, otherwise `now`. */
function frozenAt(state: RunState, nowUtc: number): number {
  return state.pausedAtUtc ?? state.stoppedAtUtc ?? nowUtc;
}

function activeAt(state: RunState, nowUtc: number): number {
  return frozenAt(state, nowUtc) - state.startedAtUtc - state.totalPausedMs;
}

function rawPositionAt(state: RunState, nowUtc: number): number {
  return activeAt(state, nowUtc) + state.seekMs;
}

function isFinishedAt(state: RunState, timeline: Timeline, nowUtc: number): boolean {
  return rawPositionAt(state, nowUtc) >= timeline.totalMs;
}

function statusOf(state: RunState, finished: boolean): RunStatus {
  if (finished) return 'finished';
  if (state.stoppedAtUtc !== undefined) return 'stopped';
  if (state.pausedAtUtc !== undefined) return 'paused';
  return 'running';
}

function skipForwardTarget(timeline: Timeline, position: number): number {
  return segmentEndMs(timeline.segments[segmentIndexAt(timeline, position)] as Segment);
}

function skipBackTarget(timeline: Timeline, position: number): number {
  const index = segmentIndexAt(timeline, position);
  const segment = timeline.segments[index] as Segment;
  const previous = timeline.segments[index - 1];
  if (position - segment.startMs > SKIP_BACK_GRACE_MS || !previous) {
    return segment.startMs;
  }
  return previous.startMs;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
