import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infra/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/abe_stack_dev',
  },
});
