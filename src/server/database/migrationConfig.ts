import path from 'path';

export const migrationConfig = {
  migrations_path: path.join(__dirname, 'migrations')
};

export function createMigrationTemplate(name: string): string {
  return `import { MigrationFn } from 'node-pg-migrate';

export const up: MigrationFn = (pgm) => {
  // Add migration code here
};

export const down: MigrationFn = (pgm) => {
  // Add rollback code here
};
`;
} 