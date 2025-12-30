# Changelog

All notable changes to @aahn/db will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-30

### Added

- Secondary export paths for granular imports:
  - `@aahn/db/schema` - Import only Drizzle schema definitions
  - `@aahn/db/client` - Import only database client factory
- Explicit `exports` field in package.json for better module resolution
- Publishing configuration for npm
- Repository and package metadata

### Changed

- Main export `@aahn/db` continues to work as before (100% backward compatible)

### Migration Guide

**No breaking changes** - all existing imports continue to work.

**Before (v1.0.0 style - still works):**

```typescript
import { users, createDbClient, buildConnectionString } from '@aahn/db';
```

**After (v1.1.0 style - optional for granular imports):**

```typescript
import { users } from '@aahn/db/schema';
import { createDbClient, buildConnectionString } from '@aahn/db/client';
```

**Benefits:**

- Import only schema without client dependencies
- Better separation of concerns
- Improved tree-shaking in applications that only need schema types

## [1.0.0] - 2025-XX-XX

### Added

- Initial release of @aahn/db
- Drizzle ORM integration with PostgreSQL
- Database schema definitions (users, sessions, etc.)
- Database client factory with connection pooling
- Connection string builder utility
- Migration support
- Type-safe query builder
- Full TypeScript support
