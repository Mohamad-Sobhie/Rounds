import { describe, expect, it } from 'vitest';

import { block, rest, round, template, work } from '../test/builders';
import { compile } from '../timeline';
import { defaultCueSettings, planCues, type Cue } from './plan';

const s = (seconds: number) => seconds * 1000;
const speech = (cues: Cue[]) =>
  cues.filter((c) => c.kind === 'speech').map((c) => [c.atMs, c.text]);
const sounds = (cues: Cue[], kind: Cue['kind']) =>
  cues.filter((c) => c.kind === kind).map((c) => c.atMs);

// #0 work 60s [0,60) · #1 rest 30s [60,90) · #2 work 60s [90,150)
const simple = compile(template({ rounds: [round(block([work(60, 'Level 15'), rest(30)], 2))] }));

describe('planCues', () => {
  it('beeps in the last three seconds of every segment', () => {
    expect(sounds(planCues(simple), 'countdown')).toEqual([
      s(57),
      s(58),
      s(59),
      s(87),
      s(88),
      s(89),
      s(147),
      s(148),
      s(149),
    ]);
  });

  it('plays a change sound at every segment start except the first, and a finish sound', () => {
    const cues = planCues(simple);
    expect(sounds(cues, 'change')).toEqual([s(60), s(90)]);
    expect(sounds(cues, 'finish')).toEqual([s(150)]);
  });

  it('announces each step with its label and duration, and the end', () => {
    expect(speech(planCues(simple, { ...defaultCueSettings, announceHalfway: false }))).toEqual([
      [0, 'Level 15, 1 minute'],
      [s(60), 'Rest, 30 seconds'],
      [s(90), 'Level 15, 1 minute'],
      [s(150), 'Workout complete'],
    ]);
  });

  it('only beeps inside segments shorter than the countdown', () => {
    const short = compile(template({ rounds: [round(block([work(2, 'Go'), work(10)]))] }));
    expect(sounds(planCues(short), 'countdown').filter((at) => at < s(2))).toEqual([s(1)]);
  });

  it('announces halfway as its own cue mid-segment', () => {
    // total 150 s → halfway at 75 s, inside the rest
    expect(speech(planCues(simple))).toContainEqual([s(75), 'Halfway']);
  });

  it('folds halfway into a segment announcement that starts just before it', () => {
    const even = compile(template({ rounds: [round(block([work(60, 'Level 8')], 2))] }));
    expect(speech(planCues(even))).toEqual([
      [0, 'Level 8, 1 minute'],
      [s(60), 'Halfway. Level 8, 1 minute'],
      [s(120), 'Workout complete'],
    ]);
  });

  it('announces the start of the last round, after any recovery', () => {
    const rounds = compile(
      template({
        rounds: [
          round(block([work(30, 'A')])),
          round(block([work(30, 'B')])),
          round(block([work(30, 'C')])),
        ],
        recoverySec: 60,
      }),
    );
    const texts = speech(planCues(rounds, { ...defaultCueSettings, announceHalfway: false }));
    expect(texts).toContainEqual([s(180), 'Last round. C, 30 seconds']);
    expect(texts.filter(([, text]) => String(text).startsWith('Last round'))).toHaveLength(1);
  });

  it('does not announce a last round for single-round workouts', () => {
    expect(speech(planCues(simple)).some(([, t]) => String(t).includes('Last round'))).toBe(false);
  });

  it('respects settings', () => {
    expect(
      planCues(simple, { ...defaultCueSettings, beeps: false }).every((c) => c.kind === 'speech'),
    ).toBe(true);
    expect(
      planCues(simple, { ...defaultCueSettings, speech: false }).some((c) => c.kind === 'speech'),
    ).toBe(false);
    expect(
      speech(
        planCues(simple, { ...defaultCueSettings, announceRest: false, announceHalfway: false }),
      ),
    ).toEqual([
      [0, 'Level 15, 1 minute'],
      [s(90), 'Level 15, 1 minute'],
      [s(150), 'Workout complete'],
    ]);
  });

  it('is sorted by position, with sounds before speech at the same moment', () => {
    const cues = planCues(simple);
    const positions = cues.map((c) => c.atMs);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    const atSixty = cues.filter((c) => c.atMs === s(60)).map((c) => c.kind);
    expect(atSixty).toEqual(['change', 'speech']);
  });
});
