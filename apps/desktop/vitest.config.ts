import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  plugins: [react()],
  test: {
    name: 'desktop',
    environment: 'jsdom',
    setupFiles: ['../web/src/__tests__/setup.ts'],
  },
});
