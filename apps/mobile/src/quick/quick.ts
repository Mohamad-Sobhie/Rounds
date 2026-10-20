import Storage from 'expo-sqlite/kv-store';

import { createQuickStore } from './quick-store';

export const quickStore = createQuickStore(Storage);
