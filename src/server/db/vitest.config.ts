// backend/db/vitest.config.ts
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../../vitest.config';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      {
        find: /^@abe-stack\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../shared/src/$1'),
      },
      {
        find: '@abe-stack/shared',
        replacement: path.resolve(__dirname, '../../shared/src/index.ts'),
      },
      {
        find: '@abe-stack/db',
        replacement: path.resolve(__dirname, 'src/index.ts'),
      },
    ],
  },
  test: {
    name: 'db',
    isolate: true,
  },
});
