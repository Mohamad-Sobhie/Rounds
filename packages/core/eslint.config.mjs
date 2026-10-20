import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended, tseslint.configs.strict, {
  rules: {
    // Core must stay platform-agnostic: it runs in tests, on device, and later on a relay.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*'],
            message: '@rounds/core must not depend on UI or platform packages.',
          },
        ],
      },
    ],
  },
});
