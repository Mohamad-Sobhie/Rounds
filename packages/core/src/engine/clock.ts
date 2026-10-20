/** Source of the current time as UTC epoch milliseconds. */
export interface Clock {
  nowUtc(): number;
}

export const systemClock: Clock = {
  nowUtc: () => Date.now(),
};

/** Manually driven clock for tests and simulations. */
export class FakeClock implements Clock {
  constructor(private current = 0) {}

  nowUtc(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }

  set(utcMs: number): void {
    this.current = utcMs;
  }
}
