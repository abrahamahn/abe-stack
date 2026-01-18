// config/schema/index.ts
/**
 * Centralized Configuration Schema - Main Entry Point
 *
 * This is the single source of truth for all configuration in the monorepo.
 * Edit the individual schema files to change settings, then run:
 *
 *   pnpm config:generate
 *
 * Generated files will have "DO NOT EDIT" headers.
 */

export * from './typescript';
export * from './build';
export * from './lint';
export * from './packages';
