import { describe, expect, it } from 'vitest';

import { formatClock } from './format';

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [1_000, '0:01'],
    [59_000, '0:59'],
    [60_000, '1:00'],
    [90_000, '1:30'],
    [3_599_000, '59:59'],
    [3_600_000, '1:00:00'],
    [3_725_000, '1:02:05'],
  ])('formats %i ms as %s', (ms, expected) => {
    expect(formatClock(ms)).toBe(expected);
  });

  it('rounds partial seconds up so a countdown never shows 0:00 early', () => {
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(59_001)).toBe('1:00');
  });

  it('clamps negative durations to zero', () => {
    expect(formatClock(-5_000)).toBe('0:00');
  });
});
