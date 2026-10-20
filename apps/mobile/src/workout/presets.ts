import { defaultQuickRoutine, quickRoutineToTemplate, type Template } from '@rounds/core';

let next = 0;
const id = () => `preset-${++next}`;

/** Temporary starting points until saved templates (#23) and the quick routine form (#25) land. */
export const presets: { title: string; template: Template }[] = [
  {
    title: 'Quick routine',
    template: quickRoutineToTemplate(defaultQuickRoutine, id),
  },
  {
    title: 'Demo: 2 rounds, 2 minutes',
    template: {
      id: 'demo',
      name: 'Demo',
      activity: 'treadmill',
      warmUp: { durationSec: 10, label: 'Easy jog' },
      rounds: [
        {
          id: id(),
          blocks: [
            {
              id: id(),
              repeat: 2,
              steps: [
                { id: id(), kind: 'work', durationSec: 12, label: 'Level 8' },
                { id: id(), kind: 'rest', durationSec: 8, label: 'Rest' },
              ],
            },
          ],
        },
        {
          id: id(),
          blocks: [
            {
              id: id(),
              repeat: 2,
              steps: [
                { id: id(), kind: 'work', durationSec: 10, label: 'Sprint' },
                { id: id(), kind: 'rest', durationSec: 8, label: 'Walk' },
              ],
            },
          ],
        },
      ],
      recoverySec: 12,
      cooldown: { durationSec: 10, label: 'Walk it off' },
    },
  },
];
