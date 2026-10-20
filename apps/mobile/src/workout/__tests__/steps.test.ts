import { compile, type Template } from '@rounds/core';

import { stepRows } from '../steps';

const step = (id: string, kind: 'work' | 'rest', label: string) => ({
  id,
  kind,
  durationSec: 30,
  label,
});
const template: Template = {
  id: 't',
  name: 't',
  activity: 'bike',
  warmUp: { durationSec: 60 },
  rounds: ['a', 'b'].map((r) => ({
    id: r,
    blocks: [
      {
        id: `${r}b`,
        repeat: 1,
        steps: [step(`${r}1`, 'work', 'Go'), step(`${r}2`, 'rest', 'Rest')],
      },
    ],
  })),
  recoverySec: 60,
  cooldown: { durationSec: 60 },
};

describe('stepRows', () => {
  it('groups segments under round, recovery, warm-up and cooldown headers', () => {
    const rows = stepRows(compile(template)).map((r) =>
      r.type === 'header' ? `# ${r.title}` : r.segment.label,
    );
    expect(rows).toEqual([
      '# Warm-up',
      'Warm-up',
      '# Round 1 of 2',
      'Go',
      'Rest',
      '# Recovery',
      'Recovery',
      '# Round 2 of 2',
      'Go',
      '# Cooldown',
      'Cooldown',
    ]);
  });
});
