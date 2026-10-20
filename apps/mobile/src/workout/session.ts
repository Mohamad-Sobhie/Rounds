import { systemClock } from '@rounds/core';
import Storage from 'expo-sqlite/kv-store';

import { createSessionStore } from './session-store';

/** App-wide session store, persisted to SQLite key-value storage. */
export const sessionStore = createSessionStore(systemClock, Storage);
export const clock = systemClock;
