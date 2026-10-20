import type { IdFactory } from './copy';
import type { ActivityType, Block, Template } from './schema';

/** The simple form behind "quick start": one work/rest pair, repeated, over identical rounds. */
export interface QuickRoutine {
  warmUpSec: number;
  workSec: number;
  restSec: number;
  repeat: number;
  rounds: number;
  /** Rest between rounds. 0 means rounds follow each other directly. */
  recoverySec: number;
  cooldownSec: number;
  activity: ActivityType;
}

export const defaultQuickRoutine: QuickRoutine = {
  warmUpSec: 300,
  workSec: 60,
  restSec: 30,
  repeat: 8,
  rounds: 1,
  recoverySec: 0,
  cooldownSec: 300,
  activity: 'treadmill',
};

/**
 * Builds a template from a quick routine. Zero-length warm-up, rest, recovery and cooldown are
 * left out rather than producing empty segments.
 */
export function quickRoutineToTemplate(
  quick: QuickRoutine,
  newId: IdFactory,
  name = 'Quick routine',
): Template {
  const block = (): Block => ({
    id: newId(),
    repeat: quick.repeat,
    steps: [
      { id: newId(), kind: 'work', durationSec: quick.workSec, label: 'Work' },
      ...(quick.restSec > 0
        ? [{ id: newId(), kind: 'rest' as const, durationSec: quick.restSec, label: 'Rest' }]
        : []),
    ],
  });

  return {
    id: newId(),
    name,
    activity: quick.activity,
    ...(quick.warmUpSec > 0 ? { warmUp: { durationSec: quick.warmUpSec } } : {}),
    rounds: Array.from({ length: quick.rounds }, () => ({ id: newId(), blocks: [block()] })),
    ...(quick.recoverySec > 0 ? { recoverySec: quick.recoverySec } : {}),
    ...(quick.cooldownSec > 0 ? { cooldown: { durationSec: quick.cooldownSec } } : {}),
  };
}
