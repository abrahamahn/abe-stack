// backend/server/src/infra/index.ts
/**
 * Infrastructure layer exports
 *
 * This layer contains technical capabilities that don't care about business logic:
 * - Database connections
 * - Storage providers (S3/Local)
 * - Email services
 * - Security utilities (JWT, password hashing, account protection)
 * - Logging and audit trails
 */

// Context and factory
export * from './ctx';
export * from './factory';

// Configuration
export * from './config';

// Security infrastructure
export * from './security';

// Email infrastructure
export * from './email';

// Logger infrastructure
export * from './logger';
