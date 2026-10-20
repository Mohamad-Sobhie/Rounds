import { describe, expect, it } from 'vitest';

import { block, rest, round, sequentialIds, template, work } from '../test/builders';
import { duplicateRound, duplicateTemplate } from './copy';

const source = template({
  rounds: [round(block([work(60, 'Level 8'), rest(30)], 3)), round(block([work(20, 'Sprint')]))],
});

function allIds(t: typeof source): string[] {
  return [
    t.id,
    ...t.rounds.flatMap((r) => [
      r.id,
      ...r.blocks.flatMap((b) => [b.id, ...b.steps.map((s) => s.id)]),
    ]),
  ];
}

describe('duplicateRound', () => {
  it('inserts a copy directly after the original', () => {
    const result = duplicateRound(source, 0, sequentialIds('new'));
    expect(result.rounds).toHaveLength(3);
    expect(result.rounds[2]).toBe(source.rounds[1]);
  });

  it('copies content but assigns new ids to the round, blocks and steps', () => {
    const result = duplicateRound(source, 0, sequentialIds('new'));
    const [original, copy] = result.rounds;
    expect(copy?.id).toBe('new-1');
    expect(copy?.blocks[0]?.steps.map((s) => s.label)).toEqual(['Level 8', 'Rest']);
    expect(copy?.blocks[0]?.steps.map((s) => s.id)).toEqual(['new-3', 'new-4']);
    expect(original).toBe(source.rounds[0]);
  });

  it('does not mutate the source template', () => {
    const before = JSON.parse(JSON.stringify(source)) as typeof source;
    duplicateRound(source, 1, sequentialIds('new'));
    expect(source).toEqual(before);
  });

  it('throws for an index out of range', () => {
    expect(() => duplicateRound(source, 5, sequentialIds())).toThrow(RangeError);
  });
});

describe('duplicateTemplate', () => {
  it('deep-copies with the new name and entirely fresh ids', () => {
    const copy = duplicateTemplate(source, 'Copy of test', sequentialIds('new'));
    expect(copy.name).toBe('Copy of test');
    expect(copy.rounds[0]?.blocks[0]?.repeat).toBe(3);
    const sourceIds = new Set(allIds(source));
    expect(allIds(copy).some((id) => sourceIds.has(id))).toBe(false);
  });
});
