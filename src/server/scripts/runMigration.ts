// src/server/scripts/runMigrations.ts
import { MigrationManager } from '../database/migrationManager';

async function runMigrations() {
  try {
    const migrationManager = new MigrationManager();
    await migrationManager.runMigrations();
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();