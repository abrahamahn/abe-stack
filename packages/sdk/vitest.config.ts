// packages/sdk/vitest.config.ts

import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../.config/vitest.base';

export default mergeConfig(baseConfig, {
  test: {
    name: 'sdk',
    environment: 'node',
  },
});
