import type { IdFactory, Template } from '@rounds/core';

/** Starting templates for a fresh install, chosen to show what templates can do. */
export function sampleTemplates(newId: IdFactory): Template[] {
  const work = (durationSec: number, label: string) => ({
    id: newId(),
    kind: 'work' as const,
    durationSec,
    label,
  });
  const rest = (durationSec: number, label = 'Rest') => ({
    id: newId(),
    kind: 'rest' as const,
    durationSec,
    label,
  });

  return [
    {
      id: newId(),
      name: 'Hill intervals',
      activity: 'treadmill',
      warmUp: { durationSec: 300, label: 'Easy jog' },
      rounds: [6, 8, 10].map((incline) => ({
        id: newId(),
        blocks: [
          { id: newId(), repeat: 3, steps: [work(60, `Incline ${incline}`), rest(30, 'Walk')] },
        ],
      })),
      recoverySec: 120,
      cooldown: { durationSec: 300, label: 'Walk' },
    },
    {
      id: newId(),
      name: 'Bike ladder',
      activity: 'bike',
      warmUp: { durationSec: 240, label: 'Level 5' },
      rounds: [
        {
          id: newId(),
          blocks: [
            {
              id: newId(),
              repeat: 1,
              steps: [
                work(60, 'Level 8'),
                rest(30),
                work(60, 'Level 10'),
                rest(30),
                work(60, 'Level 12'),
                rest(60),
              ],
            },
          ],
        },
        {
          id: newId(),
          blocks: [
            {
              id: newId(),
              repeat: 4,
              lastRepeatRestOverrideSec: 60,
              steps: [work(20, 'Sprint'), rest(40, 'Easy')],
            },
          ],
        },
      ],
      cooldown: { durationSec: 240, label: 'Level 4' },
    },
    {
      id: newId(),
      name: 'Two-minute demo',
      activity: 'other',
      warmUp: { durationSec: 10, label: 'Get ready' },
      rounds: [
        {
          id: newId(),
          blocks: [{ id: newId(), repeat: 2, steps: [work(12, 'Level 8'), rest(8)] }],
        },
        {
          id: newId(),
          blocks: [{ id: newId(), repeat: 2, steps: [work(10, 'Sprint'), rest(8, 'Walk')] }],
        },
      ],
      recoverySec: 12,
      cooldown: { durationSec: 10, label: 'Walk it off' },
    },
  ];
}
