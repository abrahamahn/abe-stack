// premium/media/vitest.config.ts

import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  test: {
    name: 'media',
    environment: 'node',
  },
});
