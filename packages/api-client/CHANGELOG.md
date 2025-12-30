# Changelog

All notable changes to @aahn/api-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-30

### Added

- Secondary export paths for granular imports:
  - `@aahn/api-client/types` - Import only TypeScript types
  - `@aahn/api-client/client` - Import only the API client factory
  - `@aahn/api-client/react-query` - Import only React Query integration
- Explicit `exports` field in package.json for better module resolution
- Publishing configuration for npm
- Repository and package metadata

### Changed

- Main export `@aahn/api-client` continues to work as before (100% backward compatible)

### Migration Guide

**No breaking changes** - all existing imports continue to work.

**Before (v1.0.0 style - still works):**

```typescript
import { createApiClient, type ApiClient } from '@aahn/api-client';
```

**After (v1.1.0 style - optional for granular imports):**

```typescript
import { createApiClient } from '@aahn/api-client/client';
import { type ApiClient } from '@aahn/api-client/types';
```

**Benefits:**

- Separating React Query integration from base client can reduce bundle size in non-React environments
- Better tree-shaking for type-only imports

## [1.0.0] - 2025-XX-XX

### Added

- Initial release of @aahn/api-client
- Type-safe API client using ts-rest
- React Query integration with custom hooks
- Automatic request/response typing
- Token-based authentication support
- Error handling utilities
- Full TypeScript support
