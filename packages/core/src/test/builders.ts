import type { Block, Round, Step, Template } from '../domain';

/** Test-only builders with sequential ids, so fixtures stay short and deterministic. */
export function sequentialIds(prefix = 'id'): () => string {
  let next = 0;
  return () => `${prefix}-${++next}`;
}

const ids = sequentialIds('fx');

export const work = (durationSec: number, label = 'Work'): Step => ({
  id: ids(),
  kind: 'work',
  durationSec,
  label,
});

export const rest = (durationSec: number, label = 'Rest'): Step => ({
  id: ids(),
  kind: 'rest',
  durationSec,
  label,
});

export const block = (steps: Step[], repeat = 1, lastRepeatRestOverrideSec?: number): Block => ({
  id: ids(),
  steps,
  repeat,
  ...(lastRepeatRestOverrideSec === undefined ? {} : { lastRepeatRestOverrideSec }),
});

export const round = (...blocks: Block[]): Round => ({ id: ids(), blocks });

export const template = (overrides: Partial<Template> & Pick<Template, 'rounds'>): Template => ({
  id: ids(),
  name: 'Test workout',
  activity: 'treadmill',
  ...overrides,
});
