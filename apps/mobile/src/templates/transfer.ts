import { duplicateTemplate, validateTemplate, type IdFactory, type Template } from '@rounds/core';

export const EXPORT_FORMAT = 'rounds.templates';
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  templates: Template[];
}

export type ImportResult =
  { ok: true; templates: Template[]; skipped: number } | { ok: false; error: string };

export function exportTemplates(templates: readonly Template[], now: Date): string {
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    templates: [...templates],
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Reads an export file (or a bare template, or an array of them). Invalid templates are skipped
 * and counted; every imported template gets fresh ids so it can never overwrite an existing one.
 */
export function importTemplates(json: string, newId: IdFactory): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }

  const candidates = extractCandidates(data);
  if (!candidates) {
    return { ok: false, error: "This file doesn't contain Rounds templates." };
  }
  if (isEnvelope(data) && data.version > EXPORT_VERSION) {
    return {
      ok: false,
      error: 'This file was made by a newer version of Rounds. Update the app and try again.',
    };
  }

  const templates: Template[] = [];
  for (const candidate of candidates) {
    const result = validateTemplate(candidate);
    if (result.ok) templates.push(duplicateTemplate(result.template, result.template.name, newId));
  }
  if (templates.length === 0) {
    return { ok: false, error: 'None of the templates in this file are valid.' };
  }
  return { ok: true, templates, skipped: candidates.length - templates.length };
}

/** File name for an export, e.g. "hill-intervals.rounds.json". */
export function exportFileName(templates: readonly Template[]): string {
  const base =
    templates.length === 1
      ? (templates[0]?.name ?? 'template')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'template'
      : 'rounds-templates';
  return `${base}.rounds.json`;
}

function isEnvelope(data: unknown): data is ExportFile {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { format?: unknown }).format === EXPORT_FORMAT
  );
}

function extractCandidates(data: unknown): unknown[] | null {
  if (isEnvelope(data)) return Array.isArray(data.templates) ? data.templates : null;
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null && 'rounds' in data) return [data];
  return null;
}
