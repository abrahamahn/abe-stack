import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../.config/vitest.base';

export default mergeConfig(baseConfig, {
  test: {
    name: 'db',
    isolate: true,
  },
});
