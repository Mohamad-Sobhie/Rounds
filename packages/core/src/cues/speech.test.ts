import { describe, expect, it } from 'vitest';

import { spokenDuration } from './speech';

describe('spokenDuration', () => {
  it.each([
    [1_000, '1 second'],
    [25_000, '25 seconds'],
    [60_000, '1 minute'],
    [90_000, '1 minute 30 seconds'],
    [120_000, '2 minutes'],
    [61_000, '1 minute 1 second'],
    [0, '0 seconds'],
  ])('%i ms → "%s"', (ms, expected) => {
    expect(spokenDuration(ms)).toBe(expected);
  });
});
