import path from 'node:path';

import { defineConfig } from 'drizzle-kit';

const repoRoot = path.resolve(__dirname, '..');
const serverRoot = path.join(repoRoot, 'apps/server');

export default defineConfig({
  schema: path.join(serverRoot, 'src/infra/database/schema/index.ts'),
  out: path.join(serverRoot, 'drizzle'),
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/abe_stack_dev',
  },
});
