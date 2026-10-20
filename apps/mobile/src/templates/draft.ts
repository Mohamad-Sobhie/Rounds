import {
  duplicateRound,
  type Block,
  type IdFactory,
  type Round,
  type Step,
  type Template,
} from '@rounds/core';

/**
 * Immutable editing operations on a template draft. Every function returns a new template and
 * leaves the input untouched. Indexes that don't exist are ignored rather than thrown, because
 * they can only come from a stale UI event.
 */

export type StepPath = { round: number; block: number; step: number };
export type BlockPath = { round: number; block: number };

export function newStep(newId: IdFactory, kind: Step['kind'] = 'work'): Step {
  return kind === 'work'
    ? { id: newId(), kind, durationSec: 60, label: 'Work' }
    : { id: newId(), kind, durationSec: 30, label: 'Rest' };
}

export function newBlock(newId: IdFactory): Block {
  return { id: newId(), repeat: 4, steps: [newStep(newId, 'work'), newStep(newId, 'rest')] };
}

export function newRound(newId: IdFactory): Round {
  return { id: newId(), blocks: [newBlock(newId)] };
}

export function newTemplate(newId: IdFactory): Template {
  return {
    id: newId(),
    name: 'New workout',
    activity: 'treadmill',
    warmUp: { durationSec: 300 },
    rounds: [newRound(newId)],
    cooldown: { durationSec: 300 },
  };
}

// Rounds

export function addRound(t: Template, newId: IdFactory): Template {
  return { ...t, rounds: [...t.rounds, newRound(newId)] };
}

export function copyRound(t: Template, round: number, newId: IdFactory): Template {
  return t.rounds[round] ? duplicateRound(t, round, newId) : t;
}

export function removeRound(t: Template, round: number): Template {
  return { ...t, rounds: t.rounds.filter((_, i) => i !== round) };
}

export function moveRound(t: Template, round: number, delta: number): Template {
  return { ...t, rounds: move(t.rounds, round, delta) };
}

// Blocks

export function addBlock(t: Template, round: number, newId: IdFactory): Template {
  return updateRound(t, round, (r) => ({ ...r, blocks: [...r.blocks, newBlock(newId)] }));
}

export function updateBlock(
  t: Template,
  path: BlockPath,
  patch: Partial<Omit<Block, 'id' | 'steps'>>,
): Template {
  return updateBlockWith(t, path, (b) => withoutUndefined({ ...b, ...patch }));
}

export function removeBlock(t: Template, path: BlockPath): Template {
  return updateRound(t, path.round, (r) => ({
    ...r,
    blocks: r.blocks.filter((_, i) => i !== path.block),
  }));
}

export function moveBlock(t: Template, path: BlockPath, delta: number): Template {
  return updateRound(t, path.round, (r) => ({ ...r, blocks: move(r.blocks, path.block, delta) }));
}

// Steps

export function addStep(
  t: Template,
  path: BlockPath,
  kind: Step['kind'],
  newId: IdFactory,
): Template {
  return updateBlockWith(t, path, (b) => ({ ...b, steps: [...b.steps, newStep(newId, kind)] }));
}

export function updateStep(
  t: Template,
  path: StepPath,
  patch: Partial<Omit<Step, 'id'>>,
): Template {
  return updateBlockWith(t, path, (b) => ({
    ...b,
    steps: b.steps.map((s, i) => (i === path.step ? withoutUndefined({ ...s, ...patch }) : s)),
  }));
}

export function removeStep(t: Template, path: StepPath): Template {
  return updateBlockWith(t, path, (b) => ({
    ...b,
    steps: b.steps.filter((_, i) => i !== path.step),
  }));
}

export function moveStep(t: Template, path: StepPath, delta: number): Template {
  return updateBlockWith(t, path, (b) => ({ ...b, steps: move(b.steps, path.step, delta) }));
}

// Helpers

function updateRound(t: Template, round: number, fn: (r: Round) => Round): Template {
  if (!t.rounds[round]) return t;
  return { ...t, rounds: t.rounds.map((r, i) => (i === round ? fn(r) : r)) };
}

function updateBlockWith(t: Template, path: BlockPath, fn: (b: Block) => Block): Template {
  return updateRound(t, path.round, (r) =>
    r.blocks[path.block]
      ? { ...r, blocks: r.blocks.map((b, i) => (i === path.block ? fn(b) : b)) }
      : r,
  );
}

function move<T>(items: readonly T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}

/** Patches use `undefined` to clear optional fields; drop them so the result stays schema-valid. */
function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}
