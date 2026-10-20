import { describe, expect, it } from 'vitest';

import { block, rest, round, template, work } from '../test/builders';
import { validateTemplate } from './validate';

const valid = template({
  warmUp: { durationSec: 300, label: 'Easy jog' },
  rounds: [round(block([work(60, 'Level 8'), rest(30)], 3, 60))],
  recoverySec: 120,
  cooldown: { durationSec: 300 },
});

describe('validateTemplate', () => {
  it('accepts a complete template', () => {
    const result = validateTemplate(valid);
    expect(result).toEqual({ ok: true, template: valid });
  });

  it('accepts a minimal template without warm-up, recovery or cooldown', () => {
    expect(validateTemplate(template({ rounds: [round(block([work(30)]))] })).ok).toBe(true);
  });

  it.each([
    ['no rounds', { ...valid, rounds: [] }, 'rounds'],
    ['a round with no blocks', { ...valid, rounds: [{ id: 'r', blocks: [] }] }, 'rounds.0.blocks'],
    [
      'a block with no steps',
      { ...valid, rounds: [round({ id: 'b', steps: [], repeat: 1 })] },
      'rounds.0.blocks.0.steps',
    ],
    [
      'repeat below 1',
      { ...valid, rounds: [round(block([work(30)], 0))] },
      'rounds.0.blocks.0.repeat',
    ],
    [
      'a zero-length step',
      { ...valid, rounds: [round(block([work(0)]))] },
      'rounds.0.blocks.0.steps.0.durationSec',
    ],
    [
      'fractional seconds',
      { ...valid, rounds: [round(block([work(1.5)]))] },
      'rounds.0.blocks.0.steps.0.durationSec',
    ],
    [
      'an empty step label',
      { ...valid, rounds: [round(block([work(30, '  ')]))] },
      'rounds.0.blocks.0.steps.0.label',
    ],
    [
      'an unknown step kind',
      { ...valid, rounds: [round(block([{ ...work(30), kind: 'sprint' as 'work' }]))] },
      'rounds.0.blocks.0.steps.0.kind',
    ],
    [
      'a malformed colour',
      { ...valid, rounds: [round(block([{ ...work(30), color: 'red' }]))] },
      'rounds.0.blocks.0.steps.0.color',
    ],
    [
      'a rest override without any rest step',
      { ...valid, rounds: [round(block([work(30)], 2, 60))] },
      'rounds.0.blocks.0.lastRepeatRestOverrideSec',
    ],
    ['a workout with only rest steps', { ...valid, rounds: [round(block([rest(30)]))] }, 'rounds'],
    ['an empty name', { ...valid, name: '' }, 'name'],
    ['an unknown activity', { ...valid, activity: 'swim' }, 'activity'],
    ['a zero recovery', { ...valid, recoverySec: 0 }, 'recoverySec'],
  ])('rejects %s', (_, input, path) => {
    const result = validateTemplate(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toContain(path);
    }
  });

  it('rejects non-object input', () => {
    expect(validateTemplate('not a template').ok).toBe(false);
    expect(validateTemplate(null).ok).toBe(false);
  });
});
