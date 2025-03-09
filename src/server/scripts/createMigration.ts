// src/server/scripts/createMigration.ts
import * as path from 'path';
import * as fs from 'fs-extra';
import { migrationConfig, createMigrationTemplate } from '../database/migrationConfig';

async function createMigration() {
  // Get migration name from command line argument
  const migrationName = process.argv[2];

  if (!migrationName) {
    console.error('Please provide a migration name');
    process.exit(1);
  }

  // Ensure migrations directory exists
  const migrationsDir = migrationConfig.migrations_path;
  await fs.ensureDir(migrationsDir);

  // Generate timestamp for migration filename
  const timestamp = new Date().toISOString().replace(/[-:\.]/g, '').slice(0, 14);
  const migrationFilename = `${timestamp}-${migrationName}.ts`;
  const migrationPath = path.join(migrationsDir, migrationFilename);

  // Write migration template
  await fs.writeFile(migrationPath, createMigrationTemplate(migrationName));

  console.log(`Migration created: ${migrationFilename}`);
}

createMigration().catch(console.error);