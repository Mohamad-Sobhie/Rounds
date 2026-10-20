import type { Segment, Timeline } from '../timeline';
import { spokenDuration } from './speech';

/**
 * - `countdown`: short beep in the last seconds of a segment
 * - `change`: distinct sound when a new segment starts
 * - `finish`: sound when the workout ends
 * - `speech`: spoken announcement, `text` is set
 */
export type CueKind = 'countdown' | 'change' | 'finish' | 'speech';

export interface Cue {
  /** Position in the timeline at which the cue plays. */
  atMs: number;
  kind: CueKind;
  /** The segment the cue belongs to. */
  segmentIndex: number;
  text?: string;
}

export interface CueSettings {
  beeps: boolean;
  speech: boolean;
  announceRest: boolean;
  announceHalfway: boolean;
  announceLastRound: boolean;
}

export const defaultCueSettings: CueSettings = {
  beeps: true,
  speech: true,
  announceRest: true,
  announceHalfway: true,
  announceLastRound: true,
};

export const COUNTDOWN_SECONDS = 3;

/** A halfway announcement this close after a segment start is folded into that announcement. */
const MERGE_WINDOW_MS = 2000;

const ORDER: Record<CueKind, number> = { countdown: 0, change: 1, finish: 1, speech: 2 };

/** Plans every cue for a timeline, sorted by position (sounds before speech at the same moment). */
export function planCues(timeline: Timeline, settings: CueSettings = defaultCueSettings): Cue[] {
  const cues: Cue[] = [];
  const { segments, totalMs } = timeline;
  const lastRoundStart = settings.announceLastRound ? firstSegmentOfLastRound(timeline) : -1;
  const halfwayMs = Math.floor(totalMs / 2);
  let halfwayMerged = false;

  segments.forEach((segment, index) => {
    if (settings.beeps) {
      if (index > 0) cues.push({ atMs: segment.startMs, kind: 'change', segmentIndex: index });
      for (let s = COUNTDOWN_SECONDS; s >= 1; s--) {
        const atMs = segment.startMs + segment.durationMs - s * 1000;
        if (atMs > segment.startMs) cues.push({ atMs, kind: 'countdown', segmentIndex: index });
      }
    }

    if (!settings.speech) return;
    const parts: string[] = [];
    if (index === lastRoundStart) parts.push('Last round');
    if (
      settings.announceHalfway &&
      halfwayMs >= segment.startMs &&
      halfwayMs - segment.startMs < MERGE_WINDOW_MS
    ) {
      parts.push('Halfway');
      halfwayMerged = true;
    }
    if (segment.kind !== 'rest' || settings.announceRest) parts.push(announce(segment));
    if (parts.length > 0) {
      cues.push({
        atMs: segment.startMs,
        kind: 'speech',
        segmentIndex: index,
        text: parts.join('. '),
      });
    }
  });

  if (settings.speech && settings.announceHalfway && !halfwayMerged && segments.length > 0) {
    const index = segments.findLastIndex((s) => s.startMs <= halfwayMs);
    cues.push({ atMs: halfwayMs, kind: 'speech', segmentIndex: index, text: 'Halfway' });
  }

  const lastIndex = segments.length - 1;
  if (settings.beeps) cues.push({ atMs: totalMs, kind: 'finish', segmentIndex: lastIndex });
  if (settings.speech) {
    cues.push({ atMs: totalMs, kind: 'speech', segmentIndex: lastIndex, text: 'Workout complete' });
  }

  return cues.sort((a, b) => a.atMs - b.atMs || ORDER[a.kind] - ORDER[b.kind]);
}

function announce(segment: Segment): string {
  return `${segment.label}, ${spokenDuration(segment.durationMs)}`;
}

function firstSegmentOfLastRound(timeline: Timeline): number {
  if (timeline.roundCount < 2) return -1;
  return timeline.segments.findIndex(
    (s) => s.roundNo === timeline.roundCount && s.kind !== 'recovery',
  );
}
