import { describe, expect, it } from 'vitest';

import { block, rest, round, template, work } from '../test/builders';
import { compile } from '../timeline';
import { FakeClock } from './clock';
import { apply, endedAtUtc, evaluate, SKIP_BACK_GRACE_MS } from './engine';
import type { EngineCommand, RunState } from './state';

/*
 * Reference timeline, 150 s total:
 *   #0 work  [  0s,  60s)
 *   #1 rest  [ 60s,  90s)
 *   #2 work  [ 90s, 150s)
 */
const timeline = compile(template({ rounds: [round(block([work(60, 'Level 8'), rest(30)], 2))] }));

const T0 = Date.UTC(2026, 9, 20, 7, 0, 0);
const s = (seconds: number) => seconds * 1000;

/** Drives the engine the way the app will: commands stamped by a clock. */
function harness() {
  const clock = new FakeClock(T0);
  let state: RunState | null = null;
  const send = (type: EngineCommand['type']) => {
    state = apply(state, { type, atUtc: clock.nowUtc() }, timeline);
  };
  const snap = () => {
    if (!state) throw new Error('not started');
    return evaluate(state, timeline, clock.nowUtc());
  };
  return { clock, send, snap, state: () => state };
}

describe('engine', () => {
  describe('start and progress', () => {
    it('ignores everything but start before starting', () => {
      for (const type of ['pause', 'resume', 'skipForward', 'skipBack', 'stop'] as const) {
        expect(apply(null, { type, atUtc: T0 }, timeline)).toBeNull();
      }
    });

    it('derives position from the clock', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(75));
      expect(h.snap()).toMatchObject({
        status: 'running',
        segmentIndex: 1,
        elapsedInSegmentMs: s(15),
        remainingInSegmentMs: s(15),
        positionMs: s(75),
        totalRemainingMs: s(75),
        activeMs: s(75),
        segmentProgress: 0.5,
        totalProgress: 0.5,
      });
    });

    it('treats a boundary as the start of the next segment', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(60));
      expect(h.snap()).toMatchObject({ segmentIndex: 1, elapsedInSegmentMs: 0 });
    });

    it('a second start is ignored', () => {
      const h = harness();
      h.send('start');
      const first = h.state();
      h.clock.advance(s(10));
      h.send('start');
      expect(h.state()).toBe(first);
    });

    it('finishes at the end and stays clamped there', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(150));
      expect(h.snap()).toMatchObject({
        status: 'finished',
        segmentIndex: 2,
        remainingInSegmentMs: 0,
        positionMs: s(150),
        totalProgress: 1,
      });
      h.clock.advance(s(600));
      expect(h.snap()).toMatchObject({ positionMs: s(150), activeMs: s(150) });
    });
  });

  describe('backgrounding', () => {
    it('is correct after a large clock jump with no intermediate evaluations', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(95)); // app suspended for 95 s
      expect(h.snap()).toMatchObject({ segmentIndex: 2, elapsedInSegmentMs: s(5) });
    });

    it('stays paused across a long suspension', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(20));
      h.send('pause');
      h.clock.advance(s(3600));
      expect(h.snap()).toMatchObject({ status: 'paused', positionMs: s(20) });
    });
  });

  describe('pause and resume', () => {
    it('freezes the position while paused and continues after resume', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(10));
      h.send('pause');
      h.clock.advance(s(30));
      expect(h.snap()).toMatchObject({ status: 'paused', positionMs: s(10) });
      h.send('resume');
      h.clock.advance(s(5));
      expect(h.snap()).toMatchObject({ status: 'running', positionMs: s(15), activeMs: s(15) });
      expect(h.state()?.totalPausedMs).toBe(s(30));
    });

    it('accumulates multiple pauses', () => {
      const h = harness();
      h.send('start');
      for (let i = 0; i < 3; i++) {
        h.clock.advance(s(10));
        h.send('pause');
        h.clock.advance(s(7));
        h.send('resume');
      }
      expect(h.state()?.totalPausedMs).toBe(s(21));
      expect(h.snap().positionMs).toBe(s(30));
    });

    it('ignores a duplicate pause or a resume while running', () => {
      const h = harness();
      h.send('start');
      h.send('resume');
      h.clock.advance(s(5));
      h.send('pause');
      const paused = h.state();
      h.clock.advance(s(5));
      h.send('pause');
      expect(h.state()).toBe(paused);
    });

    it('cannot pause once finished', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(200));
      h.send('pause');
      expect(h.snap().status).toBe('finished');
    });
  });

  describe('skip forward', () => {
    it('jumps to the start of the next segment', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(20));
      h.send('skipForward');
      expect(h.snap()).toMatchObject({ segmentIndex: 1, elapsedInSegmentMs: 0, positionMs: s(60) });
    });

    it('keeps running from the new position', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(20));
      h.send('skipForward');
      h.clock.advance(s(10));
      expect(h.snap().positionMs).toBe(s(70));
    });

    it('excludes skipped time from active time', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(20));
      h.send('skipForward'); // skips 40 s
      h.clock.advance(s(10));
      expect(h.snap()).toMatchObject({ positionMs: s(70), activeMs: s(30) });
    });

    it('finishes the workout from the last segment', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(100));
      h.send('skipForward');
      expect(h.snap()).toMatchObject({ status: 'finished', positionMs: s(150), activeMs: s(100) });
    });

    it('moves the position but stays paused when skipping while paused', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(20));
      h.send('pause');
      h.send('skipForward');
      h.clock.advance(s(30));
      expect(h.snap()).toMatchObject({ status: 'paused', segmentIndex: 1, positionMs: s(60) });
      h.send('resume');
      h.clock.advance(s(5));
      expect(h.snap().positionMs).toBe(s(65));
    });

    it('can skip through several segments in a row', () => {
      const h = harness();
      h.send('start');
      h.send('skipForward');
      h.send('skipForward');
      expect(h.snap()).toMatchObject({ segmentIndex: 2, positionMs: s(90) });
    });
  });

  describe('skip back', () => {
    it(`restarts the current segment when more than ${SKIP_BACK_GRACE_MS} ms in`, () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(70));
      h.send('skipBack');
      expect(h.snap()).toMatchObject({ segmentIndex: 1, positionMs: s(60) });
    });

    it('goes to the previous segment when near the start of the current one', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(62));
      h.send('skipBack');
      expect(h.snap()).toMatchObject({ segmentIndex: 0, positionMs: 0 });
    });

    it('restarts the first segment when there is no previous one', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(1));
      h.send('skipBack');
      expect(h.snap().positionMs).toBe(0);
    });

    it('counts repeated time as active time', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(40));
      h.send('skipBack');
      h.clock.advance(s(10));
      expect(h.snap()).toMatchObject({ positionMs: s(10), activeMs: s(50) });
    });

    it('is ignored once finished', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(150));
      h.send('skipBack');
      expect(h.snap().status).toBe('finished');
    });
  });

  describe('stop', () => {
    it('freezes the position and ignores later commands', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(30));
      h.send('stop');
      const stopped = h.state();
      h.clock.advance(s(30));
      h.send('resume');
      h.send('skipForward');
      expect(h.state()).toBe(stopped);
      expect(h.snap()).toMatchObject({ status: 'stopped', positionMs: s(30), activeMs: s(30) });
    });

    it('keeps the paused position when stopped while paused', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(30));
      h.send('pause');
      h.clock.advance(s(30));
      h.send('stop');
      expect(h.snap()).toMatchObject({ status: 'stopped', positionMs: s(30) });
    });
  });

  describe('commands are applied at their own timestamp', () => {
    it('produces the same state regardless of when a command is processed', () => {
      // A command stamped at T0+10s but evaluated at T0+12s (e.g. received late over a network)
      const start = apply(null, { type: 'start', atUtc: T0 }, timeline);
      const paused = apply(start, { type: 'pause', atUtc: T0 + s(10) }, timeline);
      if (!paused) throw new Error('expected a state');
      expect(evaluate(paused, timeline, T0 + s(12)).positionMs).toBe(s(10));
    });

    it('state survives a JSON round trip', () => {
      const h = harness();
      h.send('start');
      h.clock.advance(s(20));
      h.send('pause');
      h.send('skipForward');
      const restored = JSON.parse(JSON.stringify(h.state())) as RunState;
      expect(evaluate(restored, timeline, h.clock.nowUtc())).toEqual(h.snap());
    });
  });

  describe('invariants under random command sequences', () => {
    // Small deterministic PRNG so failures are reproducible.
    function mulberry32(seed: number) {
      return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const commands = ['pause', 'resume', 'skipForward', 'skipBack', 'stop'] as const;

    it.each([1, 2, 3, 4, 5, 6, 7, 8])('seed %i', (seed) => {
      const random = mulberry32(seed);
      const h = harness();
      h.send('start');
      let previous = h.snap();

      for (let i = 0; i < 200; i++) {
        const isCommand = random() < 0.15;
        if (isCommand) {
          h.send(commands[Math.floor(random() * commands.length)] ?? 'pause');
        } else {
          h.clock.advance(Math.floor(random() * 5000));
        }
        const current = h.snap();

        expect(current.positionMs).toBeGreaterThanOrEqual(0);
        expect(current.positionMs).toBeLessThanOrEqual(timeline.totalMs);
        expect(current.activeMs).toBeGreaterThanOrEqual(0);
        expect(current.elapsedInSegmentMs + current.remainingInSegmentMs).toBe(
          current.segment.durationMs,
        );
        if (!isCommand) {
          // Time passing alone never moves backwards, and never moves at all while paused/stopped.
          expect(current.positionMs).toBeGreaterThanOrEqual(previous.positionMs);
          if (previous.status !== 'running') {
            expect(current.positionMs).toBe(previous.positionMs);
          }
        }
        previous = current;
      }
    });
  });
});

describe('endedAtUtc', () => {
  const start = (): RunState => ({ startedAtUtc: T0, totalPausedMs: 0, seekMs: 0 });

  it('is null while running before the end', () => {
    expect(endedAtUtc(start(), timeline, T0 + s(100))).toBeNull();
  });

  it('is the moment the end was reached, even if observed much later', () => {
    expect(endedAtUtc(start(), timeline, T0 + s(3600))).toBe(T0 + s(150));
  });

  it('accounts for pauses and skips', () => {
    let state: RunState | null = start();
    state = apply(state, { type: 'pause', atUtc: T0 + s(10) }, timeline);
    state = apply(state, { type: 'resume', atUtc: T0 + s(40) }, timeline);
    state = apply(state, { type: 'skipForward', atUtc: T0 + s(50) }, timeline); // 20 s → 60 s
    // 30 s paused, 40 s skipped: the 150 s timeline ends 140 s after the start.
    expect(endedAtUtc(must(state), timeline, T0 + s(3600))).toBe(T0 + s(140));
  });

  it('is null while paused before the end', () => {
    const paused = must(apply(start(), { type: 'pause', atUtc: T0 + s(10) }, timeline));
    expect(endedAtUtc(paused, timeline, T0 + s(3600))).toBeNull();
  });

  it('is the stop time when stopped early', () => {
    const stopped = must(apply(start(), { type: 'stop', atUtc: T0 + s(30) }, timeline));
    expect(endedAtUtc(stopped, timeline, T0 + s(3600))).toBe(T0 + s(30));
  });

  it('is the natural end when stop came after the workout had already finished', () => {
    const stopped: RunState = { ...start(), stoppedAtUtc: T0 + s(500) };
    expect(endedAtUtc(stopped, timeline, T0 + s(3600))).toBe(T0 + s(150));
  });
});

function must(state: RunState | null): RunState {
  if (!state) throw new Error('expected a state');
  return state;
}
