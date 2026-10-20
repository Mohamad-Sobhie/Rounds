import { TemplateSchema, type Template } from './schema';

export interface ValidationIssue {
  /** Location of the problem, e.g. `rounds.0.blocks.1.repeat`. Empty for the template itself. */
  path: string;
  message: string;
}

export type ValidationResult =
  { ok: true; template: Template } | { ok: false; issues: ValidationIssue[] };

/** Validates untrusted input (editor state, imported JSON) against the template schema. */
export function validateTemplate(input: unknown): ValidationResult {
  const result = TemplateSchema.safeParse(input);
  if (result.success) {
    return { ok: true, template: result.data };
  }
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
}
