import type { Template } from '@rounds/core';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { newId } from '../lib/ids';
import { templatesStore } from './templates';
import { exportFileName, exportTemplates, importTemplates } from './transfer';

/** Writes the templates to a JSON file and opens the share sheet (AirDrop, Files, Mail…). */
export async function shareTemplates(templates: readonly Template[]): Promise<void> {
  const file = new File(Paths.cache, exportFileName(templates));
  if (file.exists) file.delete();
  file.create();
  file.write(exportTemplates(templates, new Date()));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Export templates',
  });
}

/** Lets the user pick an exported file and adds its templates. Returns a message to show. */
export async function pickAndImportTemplates(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  if (picked.canceled) return null;
  const result = importTemplates(await picked.result.text(), newId);
  if (!result.ok) return result.error;
  for (const template of result.templates) await templatesStore.getState().save(template);
  const added = `${result.templates.length} ${result.templates.length === 1 ? 'template' : 'templates'} imported.`;
  return result.skipped > 0 ? `${added} ${result.skipped} invalid skipped.` : added;
}
