import dotenvFlow from 'dotenv-flow';
import postgres from 'postgres';

dotenvFlow.config({ path: '.env' });
dotenvFlow.config({ path: '../../.env' });

function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'postgres';
  const auth = password ? `${user}:${password}` : user;
  return `postgres://${auth}@${host}:${port}/${database}`;
}

async function main() {
  const url = buildConnectionString();
  const sql = postgres(url, { max: 1, ssl: process.env.DB_SSL === 'true' });

  try {
    await sql`select 1`;
    console.log('Database health check: OK');
    await sql.end({ timeout: 1 });
    process.exit(0);
  } catch (error) {
    console.error('Database health check failed:', error);
    await sql.end({ timeout: 1 });
    process.exit(1);
  }
}

main();
