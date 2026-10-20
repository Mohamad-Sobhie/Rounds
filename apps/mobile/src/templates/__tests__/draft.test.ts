import { compile, validateTemplate } from '@rounds/core';

import {
  addBlock,
  addRound,
  addStep,
  copyRound,
  moveRound,
  moveStep,
  newTemplate,
  removeBlock,
  removeRound,
  removeStep,
  updateBlock,
  updateStep,
} from '../draft';
import { describeTemplate } from '../describe';

let n = 0;
const ids = () => `id-${++n}`;
const base = () => newTemplate(ids);

describe('template draft operations', () => {
  it('starts from a valid template', () => {
    expect(validateTemplate(base()).ok).toBe(true);
  });

  it('adds, copies, moves and removes rounds', () => {
    let t = addRound(base(), ids);
    t = updateStep(t, { round: 1, block: 0, step: 0 }, { label: 'Sprint' });
    t = copyRound(t, 1, ids);
    expect(t.rounds.map((r) => r.blocks[0]?.steps[0]?.label)).toEqual(['Work', 'Sprint', 'Sprint']);
    t = moveRound(t, 2, -2);
    expect(t.rounds[0]?.blocks[0]?.steps[0]?.label).toBe('Sprint');
    t = removeRound(t, 0);
    expect(t.rounds).toHaveLength(2);
  });

  it('edits blocks, including setting and clearing the last-repeat override', () => {
    let t = updateBlock(
      base(),
      { round: 0, block: 0 },
      { repeat: 6, lastRepeatRestOverrideSec: 90 },
    );
    expect(t.rounds[0]?.blocks[0]).toMatchObject({ repeat: 6, lastRepeatRestOverrideSec: 90 });
    t = updateBlock(t, { round: 0, block: 0 }, { lastRepeatRestOverrideSec: undefined });
    expect(t.rounds[0]?.blocks[0]).not.toHaveProperty('lastRepeatRestOverrideSec');
    expect(validateTemplate(t).ok).toBe(true);
  });

  it('adds, edits, moves and removes steps', () => {
    let t = addStep(base(), { round: 0, block: 0 }, 'work', ids);
    t = updateStep(t, { round: 0, block: 0, step: 2 }, { label: 'Level 12', durationSec: 45 });
    t = moveStep(t, { round: 0, block: 0, step: 2 }, -2);
    expect(t.rounds[0]?.blocks[0]?.steps.map((s) => s.label)).toEqual(['Level 12', 'Work', 'Rest']);
    t = removeStep(t, { round: 0, block: 0, step: 1 });
    expect(t.rounds[0]?.blocks[0]?.steps.map((s) => s.label)).toEqual(['Level 12', 'Rest']);
  });

  it('adds and removes blocks', () => {
    let t = addBlock(base(), 0, ids);
    expect(t.rounds[0]?.blocks).toHaveLength(2);
    t = removeBlock(t, { round: 0, block: 0 });
    expect(t.rounds[0]?.blocks).toHaveLength(1);
  });

  it('ignores out-of-range paths and moves', () => {
    const t = base();
    expect(updateStep(t, { round: 5, block: 0, step: 0 }, { label: 'x' })).toEqual(t);
    expect(moveStep(t, { round: 0, block: 0, step: 0 }, -1)).toEqual(t);
  });

  it('never mutates the input', () => {
    const t = base();
    const snapshot = JSON.stringify(t);
    addRound(t, ids);
    updateStep(t, { round: 0, block: 0, step: 0 }, { label: 'Changed' });
    expect(JSON.stringify(t)).toBe(snapshot);
  });

  it('produces templates that compile', () => {
    const t = addStep(addRound(base(), ids), { round: 1, block: 0 }, 'rest', ids);
    expect(compile(t).totalMs).toBeGreaterThan(0);
  });
});

describe('describeTemplate', () => {
  it('summarises activity, rounds and total time', () => {
    // warm-up 5:00 + 4 × (1:00 + 0:30) − last rest + cooldown 5:00 = 15:30
    expect(describeTemplate(base())).toBe('Treadmill · 1 round · 15:30');
  });
});
