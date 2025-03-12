// src/server/scripts/undoMigration.ts
import { MigrationManager } from '../database/migrationManager';

async function undoMigration() {
  try {
    const migrationManager = new MigrationManager();
    await migrationManager.rollbackMigration();
    console.log('Last migration rolled back successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration rollback failed:', error);
    process.exit(1);
  }
}

undoMigration();