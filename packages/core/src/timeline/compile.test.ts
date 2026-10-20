import { describe, expect, it } from 'vitest';

import { block, rest, round, template, work } from '../test/builders';
import { compile, totalDurationMs } from './compile';
import type { Segment } from './timeline';

/** Compact view of a segment for readable assertions: `kind:label:seconds`. */
const brief = (s: Segment) => `${s.kind}:${s.label}:${s.durationMs / 1000}`;

describe('compile', () => {
  it('expands a block by its repeat count', () => {
    const t = compile(template({ rounds: [round(block([work(60, 'Level 8'), rest(30)], 3))] }));
    expect(t.segments.map(brief)).toEqual([
      'work:Level 8:60',
      'rest:Rest:30',
      'work:Level 8:60',
      'rest:Rest:30',
      'work:Level 8:60',
    ]);
  });

  it('assigns contiguous start offsets, indexes and the total', () => {
    const t = compile(template({ rounds: [round(block([work(60), rest(30)], 2))] }));
    expect(t.segments.map((s) => [s.index, s.startMs])).toEqual([
      [0, 0],
      [1, 60_000],
      [2, 90_000],
    ]);
    expect(t.totalMs).toBe(150_000);
  });

  it('plays multiple blocks in order', () => {
    const t = compile(
      template({
        rounds: [round(block([work(60, 'Level 6'), rest(20)], 2), block([work(15, 'Sprint')], 2))],
      }),
    );
    expect(t.segments.map(brief)).toEqual([
      'work:Level 6:60',
      'rest:Rest:20',
      'work:Level 6:60',
      'rest:Rest:20',
      'work:Sprint:15',
      'work:Sprint:15',
    ]);
  });

  it('supports rounds that differ from each other', () => {
    const t = compile(
      template({
        rounds: [round(block([work(60, 'Level 8')])), round(block([work(30, 'Level 12')]))],
      }),
    );
    expect(t.segments.map(brief)).toEqual(['work:Level 8:60', 'work:Level 12:30']);
    expect(t.segments.map((s) => s.roundNo)).toEqual([1, 2]);
    expect(t.roundCount).toBe(2);
  });

  describe('last-repeat rest override', () => {
    it('replaces the last rest on the final repeat only', () => {
      const t = compile(
        template({
          rounds: [round(block([work(40), rest(20)], 3, 60)), round(block([work(10)]))],
        }),
      );
      expect(t.segments.filter((s) => s.kind === 'rest').map((s) => s.durationMs)).toEqual([
        20_000, 20_000, 60_000,
      ]);
    });

    it('targets the last rest step when a block has several', () => {
      const t = compile(
        template({
          rounds: [
            round(block([work(30), rest(10, 'Short'), work(30), rest(20, 'Long')], 2, 90)),
            round(block([work(10)])),
          ],
        }),
      );
      expect(t.segments.slice(4, 8).map(brief)).toEqual([
        'work:Work:30',
        'rest:Short:10',
        'work:Work:30',
        'rest:Long:90',
      ]);
    });

    it('drops the rest on the final repeat when the override is 0', () => {
      const t = compile(
        template({
          rounds: [round(block([work(30), rest(15)], 2, 0), block([work(10, 'Sprint')]))],
        }),
      );
      expect(t.segments.map(brief)).toEqual([
        'work:Work:30',
        'rest:Rest:15',
        'work:Work:30',
        'work:Sprint:10',
      ]);
    });
  });

  describe('recovery', () => {
    const twoRounds = [round(block([work(60), rest(30)], 2)), round(block([work(60)]))];

    it('is inserted between rounds but not after the last', () => {
      const t = compile(
        template({ rounds: [...twoRounds, round(block([work(5)]))], recoverySec: 120 }),
      );
      expect(t.segments.filter((s) => s.kind === 'recovery').map((s) => s.roundNo)).toEqual([1, 2]);
      expect(t.segments.at(-1)?.kind).toBe('work');
    });

    it('keeps a block-final rest before recovery', () => {
      const t = compile(template({ rounds: twoRounds, recoverySec: 120 }));
      expect(t.segments.map(brief)).toEqual([
        'work:Work:60',
        'rest:Rest:30',
        'work:Work:60',
        'rest:Rest:30',
        'recovery:Recovery:120',
        'work:Work:60',
      ]);
    });

    it('is omitted when not set', () => {
      const t = compile(template({ rounds: twoRounds }));
      expect(t.segments.some((s) => s.kind === 'recovery')).toBe(false);
    });
  });

  describe('warm-up and cooldown', () => {
    it('wraps the rounds and uses default labels', () => {
      const t = compile(
        template({
          warmUp: { durationSec: 300 },
          rounds: [round(block([work(60)]))],
          cooldown: { durationSec: 180 },
        }),
      );
      expect(t.segments.map(brief)).toEqual([
        'warmup:Warm-up:300',
        'work:Work:60',
        'cooldown:Cooldown:180',
      ]);
      expect(t.segments[0]).not.toHaveProperty('roundNo');
    });

    it('uses custom labels when given', () => {
      const t = compile(
        template({
          warmUp: { durationSec: 300, label: 'Easy jog' },
          rounds: [round(block([work(60)]))],
          cooldown: { durationSec: 180, label: 'Walk' },
        }),
      );
      expect([t.segments[0]?.label, t.segments.at(-1)?.label]).toEqual(['Easy jog', 'Walk']);
    });
  });

  describe('trailing rest', () => {
    it('is dropped at the end of the workout', () => {
      const t = compile(template({ rounds: [round(block([work(60), rest(30)], 2))] }));
      expect(t.segments.at(-1)?.kind).toBe('work');
      expect(t.totalMs).toBe(150_000);
    });

    it('is dropped before the cooldown', () => {
      const t = compile(
        template({ rounds: [round(block([work(60), rest(30)]))], cooldown: { durationSec: 120 } }),
      );
      expect(t.segments.map(brief)).toEqual(['work:Work:60', 'cooldown:Cooldown:120']);
    });

    it('is kept at the end of rounds other than the last', () => {
      const t = compile(
        template({
          rounds: [round(block([work(60), rest(30)])), round(block([work(60), rest(30)]))],
        }),
      );
      expect(t.segments.map(brief)).toEqual(['work:Work:60', 'rest:Rest:30', 'work:Work:60']);
    });
  });

  describe('interval numbering', () => {
    it('counts work steps per round; rests carry the preceding number', () => {
      const t = compile(
        template({
          rounds: [
            round(block([work(60), rest(20)], 2), block([work(15, 'Sprint'), rest(15)], 2)),
            round(block([work(60), rest(20)], 2)),
          ],
          recoverySec: 60,
        }),
      );
      const roundOne = t.segments.filter((s) => s.roundNo === 1 && s.kind !== 'recovery');
      expect(roundOne.map((s) => s.intervalNo)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
      expect(t.intervalsPerRound).toEqual([4, 2]);
    });

    it('leaves rests before the first work of a round unnumbered', () => {
      const t = compile(template({ rounds: [round(block([rest(10, 'Get ready'), work(30)]))] }));
      expect(t.segments[0]).not.toHaveProperty('intervalNo');
      expect(t.segments[1]?.intervalNo).toBe(1);
    });
  });

  it('carries step colours through', () => {
    const t = compile(template({ rounds: [round(block([{ ...work(30), color: '#FF5500' }]))] }));
    expect(t.segments[0]?.color).toBe('#FF5500');
  });

  it('is deterministic: the same template serializes identically', () => {
    const source = template({
      warmUp: { durationSec: 120 },
      rounds: [round(block([work(40, 'Level 10'), rest(20)], 4, 60)), round(block([work(30)], 2))],
      recoverySec: 90,
      cooldown: { durationSec: 120 },
    });
    expect(JSON.stringify(compile(source))).toBe(JSON.stringify(compile(structuredCopy(source))));
    expect(compile(source)).toMatchSnapshot();
  });
});

describe('totalDurationMs', () => {
  it('matches the compiled total', () => {
    const source = template({
      warmUp: { durationSec: 300 },
      rounds: [round(block([work(60), rest(30)], 5))],
      cooldown: { durationSec: 300 },
    });
    expect(totalDurationMs(source)).toBe(300_000 + 5 * 60_000 + 4 * 30_000 + 300_000);
  });
});

function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
