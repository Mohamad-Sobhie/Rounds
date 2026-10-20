import { MetaRepository } from '../data/meta-repository';
import { getDatabase } from '../data/open-database';
import { TemplatesRepository } from '../data/templates-repository';
import { newId } from '../lib/ids';
import { createTemplatesStore } from './templates-store';

const SAMPLES_SEEDED = 'samples_seeded';
const meta = async () => new MetaRepository(await getDatabase());

export const templatesStore = createTemplatesStore({
  repository: async () => new TemplatesRepository(await getDatabase()),
  newId,
  isFirstRun: async () => (await (await meta()).get(SAMPLES_SEEDED)) === null,
  markFirstRunDone: async () => (await meta()).set(SAMPLES_SEEDED, '1'),
});
