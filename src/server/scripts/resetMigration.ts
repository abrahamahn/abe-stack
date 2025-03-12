// src/server/scripts/resetMigration.ts
import { MigrationManager } from '../database/migrationManager';
import { Logger } from '../services/LoggerService';

async function resetMigrations() {
  const logger = new Logger('ResetMigrations');
  
  try {
    logger.info('Resetting all migrations...');
    
    const migrationManager = new MigrationManager();
    await migrationManager.resetMigrations();
    
    logger.info('All migrations have been reset successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to reset migrations', error);
    process.exit(1);
  }
}

resetMigrations();