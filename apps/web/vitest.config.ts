import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  plugins: [react()],
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
