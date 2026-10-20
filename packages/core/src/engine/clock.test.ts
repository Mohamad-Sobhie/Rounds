import { describe, expect, it } from 'vitest';

import { FakeClock, systemClock } from './clock';

describe('FakeClock', () => {
  it('only moves when told to', () => {
    const clock = new FakeClock(1_000);
    expect(clock.nowUtc()).toBe(1_000);
    clock.advance(500);
    expect(clock.nowUtc()).toBe(1_500);
    clock.set(10);
    expect(clock.nowUtc()).toBe(10);
  });
});

describe('systemClock', () => {
  it('returns UTC epoch milliseconds', () => {
    const before = Date.now();
    const now = systemClock.nowUtc();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
