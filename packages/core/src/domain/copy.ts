import type { Block, Round, Step, Template } from './schema';

/** Supplies fresh ids. Injected so core stays free of platform crypto and tests stay deterministic. */
export type IdFactory = () => string;

function copyStep(step: Step, newId: IdFactory): Step {
  return { ...step, id: newId() };
}

function copyBlock(block: Block, newId: IdFactory): Block {
  return { ...block, id: newId(), steps: block.steps.map((step) => copyStep(step, newId)) };
}

function copyRound(round: Round, newId: IdFactory): Round {
  return { ...round, id: newId(), blocks: round.blocks.map((block) => copyBlock(block, newId)) };
}

/** Returns a new template with the round at `index` duplicated directly after it. */
export function duplicateRound(template: Template, index: number, newId: IdFactory): Template {
  const round = template.rounds[index];
  if (!round) {
    throw new RangeError(`No round at index ${index}`);
  }
  const rounds = [...template.rounds];
  rounds.splice(index + 1, 0, copyRound(round, newId));
  return { ...template, rounds };
}

/** Deep-copies a template with new ids throughout and the given name. */
export function duplicateTemplate(template: Template, name: string, newId: IdFactory): Template {
  return {
    ...template,
    id: newId(),
    name,
    rounds: template.rounds.map((round) => copyRound(round, newId)),
  };
}
