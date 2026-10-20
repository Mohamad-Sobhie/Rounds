import { compile, evaluate, type Template } from '@rounds/core';

import { workoutView } from '../view-model';

const template: Template = {
  id: 't',
  name: 'Intervals',
  activity: 'bike',
  warmUp: { durationSec: 60 },
  rounds: ['r1', 'r2'].map((id) => ({
    id,
    blocks: [
      {
        id: `${id}-b`,
        repeat: 2,
        steps: [
          { id: `${id}-w`, kind: 'work' as const, durationSec: 40, label: 'Level 15' },
          { id: `${id}-r`, kind: 'rest' as const, durationSec: 25, label: 'Rest' },
        ],
      },
    ],
  })),
  cooldown: { durationSec: 120 },
};
// warm-up 60 | 2 rounds × 2 × (Level 15 40 + Rest 25), final rest dropped | cooldown 120 → 6:55
const timeline = compile(template);
const at = (positionSec: number) =>
  evaluate({ startedAtUtc: 0, totalPausedMs: 0, seekMs: 0 }, timeline, positionSec * 1000);

describe('workoutView', () => {
  it('previews the first segment before starting', () => {
    expect(workoutView(timeline, null)).toEqual({
      status: 'ready',
      phase: 'warmup',
      label: 'Warm-up',
      countdown: '1:00',
      next: 'Level 15 0:40',
      round: null,
      interval: null,
      remaining: '6:55',
    });
  });

  it('describes a work segment mid-way', () => {
    expect(workoutView(timeline, at(70))).toMatchObject({
      status: 'running',
      phase: 'work',
      label: 'Level 15',
      countdown: '0:30',
      next: 'Rest 0:25',
      round: '1/2',
      interval: '1/2',
      remaining: '5:45',
    });
  });

  it('numbers intervals within the second round', () => {
    expect(workoutView(timeline, at(60 + 130 + 25 + 45))).toMatchObject({
      round: '2/2',
      interval: '2/2',
    });
  });

  it('has no next step on the last segment', () => {
    expect(workoutView(timeline, at(400)).next).toBeNull();
  });
});
