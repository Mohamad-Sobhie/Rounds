import type { Cue } from './plan';

/** Position changes larger than this between two checks are treated as a jump, not playback. */
export const MAX_PLAYBACK_GAP_MS = 1500;

/** After a jump, cues this recent are still played (so landing on a segment start announces it). */
const RESYNC_WINDOW_MS = 1000;

/**
 * Returns the cues to play when the position moved from `previousMs` to `currentMs`.
 *
 * During normal playback that is every cue in `(previous, current]`. After a jump (a skip, a resume
 * from suspension, or the first check with `previousMs === null`) stale cues are dropped and only
 * non-countdown cues from the last second are returned, so the user never hears a burst of beeps.
 */
export function dueCues(plan: readonly Cue[], previousMs: number | null, currentMs: number): Cue[] {
  const isPlayback =
    previousMs !== null && currentMs >= previousMs && currentMs - previousMs <= MAX_PLAYBACK_GAP_MS;

  if (isPlayback) {
    return plan.filter((cue) => cue.atMs > previousMs && cue.atMs <= currentMs);
  }
  return plan.filter(
    (cue) =>
      cue.kind !== 'countdown' && cue.atMs <= currentMs && currentMs - cue.atMs <= RESYNC_WINDOW_MS,
  );
}
