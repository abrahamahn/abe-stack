# Changelog

All notable changes to @aahn/storage will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-30

### Added

- Secondary export paths for granular provider imports:
  - `@aahn/storage/types` - Import only TypeScript types and interfaces
  - `@aahn/storage/local` - Import only local file system provider
  - `@aahn/storage/s3` - Import only AWS S3 provider
  - `@aahn/storage/factory` - Import only storage factory function
- Publishing configuration for npm
- Repository and package metadata

### Changed

- Main export `@aahn/storage` continues to work as before (100% backward compatible)

### Migration Guide

**No breaking changes** - all existing imports continue to work.

**Before (v1.0.0 style - still works):**

```typescript
import { createStorage, LocalStorageProvider } from '@aahn/storage';
```

**After (v1.1.0 style - recommended):**

```typescript
import { LocalStorageProvider } from '@aahn/storage/local';
import { createStorage } from '@aahn/storage/factory';
```

**Key Benefit - Reduced Bundle Size:**

Using granular imports prevents bundling unused storage providers:

- Importing `@aahn/storage/local` avoids bundling AWS SDK (~300KB)
- Importing `@aahn/storage/s3` only includes S3 dependencies when needed
- Critical for browser bundles where you typically only use one provider

**Example for browser (web app):**

```typescript
// Before: Bundles both local AND S3 (including AWS SDK)
import { LocalStorageProvider } from '@aahn/storage';

// After: Only bundles local storage (no AWS SDK)
import { LocalStorageProvider } from '@aahn/storage/local';
```

**Example for server (Node.js):**

```typescript
// Server can import both providers efficiently
import { S3StorageProvider } from '@aahn/storage/s3';
import { LocalStorageProvider } from '@aahn/storage/local';
```

## [1.0.0] - 2025-XX-XX

### Added

- Initial release of @aahn/storage
- Pluggable storage provider architecture
- Local file system storage provider
- AWS S3 storage provider
- Storage factory for creating configured instances
- Common storage interface (upload, download, delete, list)
- Support for file metadata and multipart uploads
- Full TypeScript support
