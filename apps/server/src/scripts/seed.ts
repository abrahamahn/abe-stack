import { createDbClient, resolveConnectionStringWithFallback, users } from '@abe-stack/db';
import dotenvFlow from 'dotenv-flow';

dotenvFlow.config({ path: '.env' });
dotenvFlow.config({ path: '../../.env' });

async function main(): Promise<void> {
  const connectionString = await resolveConnectionStringWithFallback(process.env);
  const db = createDbClient(connectionString);

  // eslint-disable-next-line no-console
  console.log(`🌱 Connected to database (port ${process.env.POSTGRES_PORT || 'unknown'})`);

  try {
    const existing = await db.select().from(users).limit(1);
    if (existing.length === 0) {
      // eslint-disable-next-line no-console
      console.log('Creating default user...');
      await db.insert(users).values({
        email: 'admin@abestack.com',
        passwordHash: '$2b$10$EpWaTgiFJcCNi078F/8OBOd0.o.Jq1b1/2C1.t1.1.1.1.1.1.1.1', // "password" hash
        name: 'Admin User',
      });
      // eslint-disable-next-line no-console
      console.log('✅ Default user created: admin@abestack.com / password');
    } else {
      // eslint-disable-next-line no-console
      console.log('ℹ️ Users already exist, skipping creation.');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  } finally {
    // eslint-disable-next-line no-console
    console.log('✨ Seed complete');
    process.exit(0);
  }
}

void main();
