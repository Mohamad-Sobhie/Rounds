import { describe, expect, it } from 'vitest';

import { block, rest, round, template, work } from '../test/builders';
import { compile } from '../timeline';
import { dueCues } from './due';
import { defaultCueSettings, planCues } from './plan';

const s = (seconds: number) => seconds * 1000;
const plan = planCues(
  compile(template({ rounds: [round(block([work(60, 'Level 15'), rest(30)], 2))] })),
  { ...defaultCueSettings, announceHalfway: false },
);
const kinds = (cues: ReturnType<typeof dueCues>) => cues.map((c) => `${c.kind}@${c.atMs / 1000}`);

describe('dueCues', () => {
  it('returns cues crossed during normal playback', () => {
    expect(kinds(dueCues(plan, s(56.9), s(58)))).toEqual(['countdown@57', 'countdown@58']);
  });

  it('includes a cue exactly at the current position but not at the previous one', () => {
    expect(kinds(dueCues(plan, s(59), s(60)))).toEqual(['change@60', 'speech@60']);
    expect(dueCues(plan, s(60), s(60.5))).toEqual([]);
  });

  it('announces the first segment on the initial check', () => {
    expect(kinds(dueCues(plan, null, 0))).toEqual(['speech@0']);
  });

  it('returns nothing while the position does not move (paused)', () => {
    expect(dueCues(plan, s(58), s(58))).toEqual([]);
  });

  it('after a skip forward, announces the landed segment without replaying skipped cues', () => {
    expect(kinds(dueCues(plan, s(20), s(60)))).toEqual(['change@60', 'speech@60']);
  });

  it('after a skip back, announces the landed segment', () => {
    expect(kinds(dueCues(plan, s(70), s(60)))).toEqual(['change@60', 'speech@60']);
  });

  it('after a long suspension, drops stale cues and never bursts countdown beeps', () => {
    expect(dueCues(plan, s(10), s(88.5))).toEqual([]);
    expect(kinds(dueCues(plan, s(10), s(90.4)))).toEqual(['change@90', 'speech@90']);
  });

  it('plays the finish cues when reaching the end', () => {
    expect(kinds(dueCues(plan, s(149.5), s(150)))).toEqual(['finish@150', 'speech@150']);
  });
});
