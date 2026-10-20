import { z } from 'zod';

/** Whole seconds. Workouts are authored at one-second resolution. */
const durationSec = z.number().int().positive();
const id = z.string().min(1);

export const activityTypes = ['treadmill', 'bike', 'rower', 'run', 'other'] as const;
export const ActivityTypeSchema = z.enum(activityTypes);

export const stepKinds = ['work', 'rest'] as const;
export const StepKindSchema = z.enum(stepKinds);

/** `#RRGGBB` */
export const ColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #RRGGBB colour');

/** A single timed segment with an optional label, used for warm-up and cooldown. */
export const TimedSegmentSchema = z.object({
  durationSec,
  label: z.string().trim().min(1).optional(),
});

export const StepSchema = z.object({
  id,
  durationSec,
  kind: StepKindSchema,
  /** Main on-screen cue, e.g. "Level 8", "Speed 12", "Sprint". */
  label: z.string().trim().min(1),
  color: ColorSchema.optional(),
});

export const BlockSchema = z
  .object({
    id,
    steps: z.array(StepSchema).min(1),
    repeat: z.number().int().min(1),
    /**
     * Replaces the duration of the block's last rest step on the final repeat.
     * `0` removes that rest on the final repeat.
     */
    lastRepeatRestOverrideSec: z.number().int().min(0).optional(),
  })
  .refine(
    (block) =>
      block.lastRepeatRestOverrideSec === undefined ||
      block.steps.some((step) => step.kind === 'rest'),
    {
      message: 'A last-repeat rest override needs at least one rest step in the block',
      path: ['lastRepeatRestOverrideSec'],
    },
  );

export const RoundSchema = z.object({
  id,
  blocks: z.array(BlockSchema).min(1),
});

export const TemplateSchema = z
  .object({
    id,
    name: z.string().trim().min(1),
    activity: ActivityTypeSchema,
    warmUp: TimedSegmentSchema.optional(),
    rounds: z.array(RoundSchema).min(1),
    /** Rest between rounds. Absent means no recovery. */
    recoverySec: durationSec.optional(),
    cooldown: TimedSegmentSchema.optional(),
  })
  .refine(
    (template) =>
      template.rounds.some((round) =>
        round.blocks.some((block) => block.steps.some((step) => step.kind === 'work')),
      ),
    { message: 'A workout needs at least one work step', path: ['rounds'] },
  );

export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type StepKind = z.infer<typeof StepKindSchema>;
export type TimedSegment = z.infer<typeof TimedSegmentSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Round = z.infer<typeof RoundSchema>;
export type Template = z.infer<typeof TemplateSchema>;
