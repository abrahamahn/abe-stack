import path from "path";

export interface MigrationConfig {
  migrations_path: string;
  migrations_table: string;
  migration_file_extension: string;
  migration_template_path?: string;
}

export const migrationConfig: MigrationConfig = {
  migrations_path: path.join(
    process.cwd(),
    "src/server/database/migrations/migrations",
  ),
  migrations_table: "migrations",
  migration_file_extension: ".ts", // Support for TypeScript migrations
};

export const createMigrationTemplate = (name: string): string => `
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

// Migration: ${name}
// Created: ${new Date().toISOString()}

export function up(pgm: MigrationBuilder): void {
  // Add migration code here
  // Examples:
  // pgm.createTable('table_name', {
  //   id: 'id',
  //   name: { type: 'varchar(1000)', notNull: true },
  //   created_at: {
  //     type: 'timestamp',
  //     notNull: true,
  //     default: pgm.func('current_timestamp'),
  //   },
  // });
  // pgm.createIndex('table_name', 'name');
}

export function down(pgm: MigrationBuilder): void {
  // Add rollback code here
  // Examples:
  // pgm.dropTable('table_name');
}
`;
