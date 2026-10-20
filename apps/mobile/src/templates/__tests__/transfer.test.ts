import type { Template } from '@rounds/core';

import { exportFileName, exportTemplates, importTemplates } from '../transfer';

const template: Template = {
  id: 'orig',
  name: 'Hill Intervals!',
  activity: 'treadmill',
  rounds: [
    {
      id: 'r',
      blocks: [
        {
          id: 'b',
          repeat: 3,
          steps: [{ id: 's', kind: 'work', durationSec: 60, label: 'Incline 6' }],
        },
      ],
    },
  ],
};
let n = 0;
const ids = () => `new-${++n}`;

describe('template import/export', () => {
  it('round-trips templates with fresh ids', () => {
    const json = exportTemplates([template], new Date('2026-10-20T10:00:00Z'));
    const result = importTemplates(json, ids);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [imported] = result.templates;
    expect(imported?.name).toBe('Hill Intervals!');
    expect(imported?.rounds[0]?.blocks[0]?.steps[0]?.label).toBe('Incline 6');
    expect(imported?.id).not.toBe('orig');
    expect(result.skipped).toBe(0);
  });

  it('accepts a bare template or an array', () => {
    expect(importTemplates(JSON.stringify(template), ids).ok).toBe(true);
    expect(importTemplates(JSON.stringify([template, template]), ids)).toMatchObject({
      ok: true,
      skipped: 0,
    });
  });

  it('skips invalid templates and counts them', () => {
    const json = JSON.stringify([template, { ...template, rounds: [] }]);
    expect(importTemplates(json, ids)).toMatchObject({ ok: true, skipped: 1 });
  });

  it.each([
    ['not json', "This file isn't valid JSON."],
    ['{"hello": 1}', "This file doesn't contain Rounds templates."],
    ['[{"rounds": []}]', 'None of the templates in this file are valid.'],
    [
      JSON.stringify({ format: 'rounds.templates', version: 99, templates: [] }),
      'This file was made by a newer version of Rounds. Update the app and try again.',
    ],
  ])('explains why %s cannot be imported', (json, error) => {
    expect(importTemplates(json, ids)).toEqual({ ok: false, error });
  });

  it('names export files', () => {
    expect(exportFileName([template])).toBe('hill-intervals.rounds.json');
    expect(exportFileName([template, template])).toBe('rounds-templates.rounds.json');
  });
});
