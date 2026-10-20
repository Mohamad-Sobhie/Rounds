import { randomUUID } from 'expo-crypto';

/** Fresh ids for templates, rounds, blocks and steps. */
export const newId = (): string => randomUUID();
