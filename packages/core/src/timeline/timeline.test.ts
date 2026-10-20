import { describe, expect, it } from 'vitest';

import { block, rest, round, template, work } from '../test/builders';
import { compile } from './compile';
import { segmentIndexAt, type Timeline } from './timeline';

// Segments: [0, 60s) work, [60s, 90s) rest, [90s, 150s) work
const timeline = compile(template({ rounds: [round(block([work(60), rest(30)], 2))] }));

describe('segmentIndexAt', () => {
  it.each([
    [0, 0],
    [59_999, 0],
    [60_000, 1],
    [89_999, 1],
    [90_000, 2],
    [149_999, 2],
    [150_000, 2],
    [1_000_000, 2],
    [-5, 0],
  ])('position %i ms is in segment %i', (position, expected) => {
    expect(segmentIndexAt(timeline, position)).toBe(expected);
  });

  it('returns -1 for an empty timeline', () => {
    const empty: Timeline = { ...timeline, segments: [], totalMs: 0 };
    expect(segmentIndexAt(empty, 0)).toBe(-1);
  });
});
