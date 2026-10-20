import type { Block, Template } from '../domain';
import { TIMELINE_SCHEMA_VERSION, type Segment, type SegmentKind, type Timeline } from './timeline';

const SECOND = 1000;

type SegmentDraft = Omit<Segment, 'index' | 'startMs'>;

/**
 * Compiles a template into a timeline.
 *
 * Rules:
 * - Blocks expand into `repeat` copies of their steps.
 * - On a block's final repeat, `lastRepeatRestOverrideSec` replaces the duration of its last rest
 *   step; an override of 0 drops that rest.
 * - Recovery is inserted between rounds, never after the last one.
 * - A rest that would be the last thing before the cooldown (or the end of the workout) is dropped:
 *   resting right before cooling down or finishing adds nothing.
 */
export function compile(template: Template): Timeline {
  const drafts: SegmentDraft[] = [];
  const intervalsPerRound: number[] = [];

  if (template.warmUp) {
    drafts.push(fixed('warmup', template.warmUp.label ?? 'Warm-up', template.warmUp.durationSec));
  }

  template.rounds.forEach((round, roundIndex) => {
    const roundNo = roundIndex + 1;
    let intervalNo = 0;

    for (const block of round.blocks) {
      const overrideIndex = lastRestIndex(block);

      for (let repeat = 1; repeat <= block.repeat; repeat++) {
        const isFinalRepeat = repeat === block.repeat;

        block.steps.forEach((step, stepIndex) => {
          let durationSec = step.durationSec;
          if (
            isFinalRepeat &&
            stepIndex === overrideIndex &&
            block.lastRepeatRestOverrideSec !== undefined
          ) {
            durationSec = block.lastRepeatRestOverrideSec;
          }
          if (durationSec === 0) return;

          if (step.kind === 'work') intervalNo++;

          drafts.push({
            kind: step.kind,
            label: step.label,
            durationMs: durationSec * SECOND,
            roundNo,
            ...(intervalNo > 0 ? { intervalNo } : {}),
            ...(step.color ? { color: step.color } : {}),
          });
        });
      }
    }

    intervalsPerRound.push(intervalNo);

    const isLastRound = roundIndex === template.rounds.length - 1;
    if (isLastRound && drafts.at(-1)?.kind === 'rest') {
      drafts.pop();
    }
    if (!isLastRound && template.recoverySec) {
      drafts.push({ ...fixed('recovery', 'Recovery', template.recoverySec), roundNo });
    }
  });

  if (template.cooldown) {
    drafts.push(
      fixed('cooldown', template.cooldown.label ?? 'Cooldown', template.cooldown.durationSec),
    );
  }

  let startMs = 0;
  const segments = drafts.map((draft, index): Segment => {
    const segment = { index, startMs, ...draft };
    startMs += draft.durationMs;
    return segment;
  });

  return {
    schemaVersion: TIMELINE_SCHEMA_VERSION,
    segments,
    totalMs: startMs,
    roundCount: template.rounds.length,
    intervalsPerRound,
  };
}

/** Total duration of a template in milliseconds, for live totals in editors. */
export function totalDurationMs(template: Template): number {
  return compile(template).totalMs;
}

function fixed(kind: SegmentKind, label: string, durationSec: number): SegmentDraft {
  return { kind, label, durationMs: durationSec * SECOND };
}

function lastRestIndex(block: Block): number {
  return block.steps.findLastIndex((step) => step.kind === 'rest');
}
