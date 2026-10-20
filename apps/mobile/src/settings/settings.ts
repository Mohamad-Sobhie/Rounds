import Storage from 'expo-sqlite/kv-store';

import { createSettingsStore } from './settings-store';

export const settingsStore = createSettingsStore(Storage);
