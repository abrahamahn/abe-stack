// packages/shared/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/core/index.ts',
    'src/types/index.ts',
    'src/domain/index.ts',
    'src/utils/index.ts',
    'src/config/index.ts',
    'src/contracts/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  clean: true,
  sourcemap: true,
  splitting: false, // Prevent chunking for cleaner output structure
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.js' };
  },
});
