import { describe, expect, it } from 'vitest';

import { sequentialIds } from '../test/builders';
import { compile, totalDurationMs } from '../timeline';
import { defaultQuickRoutine, quickRoutineToTemplate, type QuickRoutine } from './quick-routine';
import { validateTemplate } from './validate';

const build = (overrides: Partial<QuickRoutine> = {}) =>
  quickRoutineToTemplate({ ...defaultQuickRoutine, ...overrides }, sequentialIds());

describe('quickRoutineToTemplate', () => {
  it('produces a valid template', () => {
    expect(validateTemplate(build()).ok).toBe(true);
  });

  it('builds identical rounds of one work/rest block', () => {
    const t = build({ rounds: 3, repeat: 5 });
    expect(t.rounds).toHaveLength(3);
    for (const round of t.rounds) {
      expect(round.blocks).toHaveLength(1);
      expect(round.blocks[0]?.repeat).toBe(5);
      expect(round.blocks[0]?.steps.map((s) => [s.kind, s.durationSec])).toEqual([
        ['work', 60],
        ['rest', 30],
      ]);
    }
  });

  it('computes the default total: 5 min warm-up, 8 × (60 s + 30 s) minus the final rest, 5 min cooldown', () => {
    expect(totalDurationMs(build())).toBe((300 + 8 * 90 - 30 + 300) * 1000);
  });

  it('adds recovery between rounds', () => {
    const quick = { warmUpSec: 0, cooldownSec: 0, rounds: 3, repeat: 2, recoverySec: 120 };
    // per round: 2 × (60 + 30) = 180; three rounds; two recoveries; trailing rest dropped
    expect(totalDurationMs(build(quick))).toBe((3 * 180 + 2 * 120 - 30) * 1000);
  });

  it('leaves out zero-length parts', () => {
    const t = build({ warmUpSec: 0, restSec: 0, cooldownSec: 0 });
    expect(t).not.toHaveProperty('warmUp');
    expect(t).not.toHaveProperty('cooldown');
    expect(t).not.toHaveProperty('recoverySec');
    expect(t.rounds[0]?.blocks[0]?.steps.map((s) => s.kind)).toEqual(['work']);
  });

  it('handles a single round with a single repeat', () => {
    const timeline = compile(build({ rounds: 1, repeat: 1, warmUpSec: 0, cooldownSec: 0 }));
    expect(timeline.segments.map((s) => s.kind)).toEqual(['work']);
  });
});
