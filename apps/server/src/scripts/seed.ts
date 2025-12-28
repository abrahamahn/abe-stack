import { buildConnectionString } from '@abe-stack/db';
import dotenvFlow from 'dotenv-flow';
import postgres from 'postgres';

dotenvFlow.config({ path: '.env' });
dotenvFlow.config({ path: '../../.env' });

async function main(): Promise<void> {
  const url = buildConnectionString(process.env);
  const sql = postgres(url, {
    max: 2,
    ssl: process.env.DB_SSL === 'true',
  });

  try {
    // TODO: Add real seed data once schema is defined.
    // When adding seed data, create db instance: const db = drizzle(sql);
    // eslint-disable-next-line no-console
    console.log('Seed script connected. Add seed operations here.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Seed script failed:', error);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

void main();
