# Changelog

All notable changes to @aahn/shared will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-30

### Added

- New secondary export paths for granular imports:
  - `@aahn/shared/contracts` - Import only API contracts (ts-rest)
  - `@aahn/shared/utils` - Import only utility functions (tokenStore)
  - `@aahn/shared/env` - Import only environment validation
- Publishing configuration for npm
- Repository and package metadata

### Changed

- Main export `@aahn/shared` continues to work as before (100% backward compatible)
- Existing `./storageConfig` secondary export unchanged

### Migration Guide

**No breaking changes** - all existing imports continue to work.

**Before (v1.0.0 style - still works):**

```typescript
import { apiContract, tokenStore } from '@aahn/shared';
import { toStorageConfig } from '@aahn/shared/storageConfig';
```

**After (v1.1.0 style - optional for granular imports):**

```typescript
import { apiContract } from '@aahn/shared/contracts';
import { tokenStore } from '@aahn/shared/utils';
import { toStorageConfig } from '@aahn/shared/storageConfig';
```

## [1.0.0] - 2025-XX-XX

### Added

- Initial release of @aahn/shared
- API contracts with ts-rest for type-safe client-server communication
- Authentication contracts (login, register, refresh, logout)
- User management contracts
- Storage configuration utilities
- Token store for client-side token management
- Environment validation with Zod schemas
- Full TypeScript support
