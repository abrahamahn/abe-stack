// config/drizzle.config.ts
import path from 'node:path';

import { defineConfig } from 'drizzle-kit';

const repoRoot = path.resolve(__dirname, '..');
const serverRoot = path.join(repoRoot, 'apps/server');

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || 'postgres';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'abe_stack_dev';

  return `postgres://${user}:${password}@${host}:${port}/${db}`;
}

export default defineConfig({
  schema: path.join(serverRoot, 'src/infrastructure/data/database/schema/index.ts'),
  out: path.join(serverRoot, 'drizzle'),
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
