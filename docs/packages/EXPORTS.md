# Package Exports Guide

## Overview

All @abeahn packages support granular imports for optimal tree-shaking and bundle size optimization. This guide covers all available export paths and their usage.

## Table of Contents

- [@abeahn/ui](#abe-stackui)
- [@abeahn/shared](#abe-stackshared)
- [@abeahn/api-client](#abe-stackapi-client)
- [@abeahn/storage](#abe-stackstorage)
- [@abeahn/db](#abe-stackdb)
- [Best Practices](#best-practices)
- [TypeScript Configuration](#typescript-configuration)

---

## @abeahn/ui

The UI package provides the most benefit from granular imports due to its size (~120KB for full package).

### Main Export (All Components)

Import everything from the UI package:

```typescript
import { Button, Card, useMediaQuery } from '@abeahn/ui';
```

**Use when:** You need components from multiple categories.

### Category Exports (Recommended)

Import only specific categories for better tree-shaking:

#### Components

```typescript
import { Button, Card, Input, Heading, Text, Image, PageContainer } from '@abeahn/ui/components';
```

**Includes:** 7 core components
**Bundle size:** ~40KB

#### Primitives

```typescript
import {
  Accordion,
  Alert,
  Avatar,
  Dialog,
  DropdownMenu,
  Popover,
  Select,
  Table,
} from '@abeahn/ui/primitives';
```

**Includes:** 35+ Radix UI primitives
**Bundle size:** ~60KB

#### Layouts

```typescript
import {
  Container,
  AppShell,
  SidebarLayout,
  AuthLayout,
  PageLayout,
  ResizablePanel,
} from '@abeahn/ui/layouts';
```

**Includes:** 6 layout components
**Bundle size:** ~30KB

#### Hooks

```typescript
import {
  useMediaQuery,
  useLocalStorage,
  useDisclosure,
  useDebounce,
  useThrottle,
} from '@abeahn/ui/hooks';
```

**Includes:** 9 custom hooks
**Bundle size:** ~8KB

#### Theme

```typescript
import { colors, spacing, typography, motion } from '@abeahn/ui/theme';
```

**Includes:** Design tokens and theme configuration
**Bundle size:** ~4KB

#### Utils

```typescript
import { cn } from '@abeahn/ui/utils';
```

**Includes:** Utility functions
**Bundle size:** ~2KB

### Bundle Size Comparison

| Import Style        | Estimated Bundle Size | Use Case                           |
| ------------------- | --------------------- | ---------------------------------- |
| Full (`@abeahn/ui`) | ~120KB                | Importing from multiple categories |
| Components only     | ~40KB                 | Only using core components         |
| Primitives only     | ~60KB                 | Only using Radix primitives        |
| Layouts only        | ~30KB                 | Only using layout components       |
| Hooks only          | ~8KB                  | Only using custom hooks            |
| Theme only          | ~4KB                  | Only using design tokens           |
| Utils only          | ~2KB                  | Only using utilities               |

### Example: Optimized Login Page

**Before (v1.0.0 - still works):**

```typescript
import { Button, Card, Input, useDisclosure } from '@abeahn/ui';
// Bundle size: ~120KB (entire UI package)
```

**After (v1.1.0 - recommended):**

```typescript
import { Button, Card, Input } from '@abeahn/ui/components';
import { useDisclosure } from '@abeahn/ui/hooks';
// Bundle size: ~48KB (components + hooks only)
// Savings: 60%
```

---

## @abeahn/shared

### Main Export (All Utilities)

```typescript
import { apiContract, tokenStore, type ServerEnv } from '@abeahn/shared';
```

### Granular Exports

#### Contracts

Import only API contracts:

```typescript
import { apiContract } from '@abeahn/shared/contracts';
import type { LoginRequest, AuthResponse } from '@abeahn/shared/contracts';
```

**Includes:** ts-rest API contracts for authentication, users, etc.

#### Utils

Import only utility functions:

```typescript
import { tokenStore } from '@abeahn/shared/utils';
```

**Includes:** Token storage, helpers

#### Environment

Import only environment validation:

```typescript
import { clientEnvSchema, serverEnvSchema, type ServerEnv } from '@abeahn/shared/env';
```

**Includes:** Zod schemas for env validation

#### Storage Config

Import storage configuration helper:

```typescript
import { toStorageConfig } from '@abeahn/shared/storageConfig';
```

**Includes:** Convert env to storage config

### Example Usage

**Server-side (needs contracts + env):**

```typescript
import { apiContract } from '@abeahn/shared/contracts';
import { serverEnvSchema } from '@abeahn/shared/env';
import { toStorageConfig } from '@abeahn/shared/storageConfig';
```

**Client-side (needs contracts + utils):**

```typescript
import { apiContract } from '@abeahn/shared/contracts';
import { tokenStore } from '@abeahn/shared/utils';
```

---

## @abeahn/api-client

### Main Export (All Features)

```typescript
import { createApiClient, type ApiClient } from '@abeahn/api-client';
```

### Granular Exports

#### Types

Import only TypeScript types:

```typescript
import type { ApiClient, ApiClientConfig } from '@abeahn/api-client/types';
```

**Use when:** You only need types for declarations.

#### Client

Import only the API client factory:

```typescript
import { createApiClient } from '@abeahn/api-client/client';
```

**Use when:** You don't need React Query integration.
**Benefit:** Excludes @tanstack/react-query from bundle.

#### React Query

Import only React Query integration:

```typescript
import { useApiQuery, useApiMutation } from '@abeahn/api-client/react-query';
```

**Use when:** You only need React Query hooks.

### Example: Non-React Environment

If you're using the API client in a Node.js script or non-React environment:

```typescript
// Before: Bundles React Query unnecessarily
import { createApiClient } from '@abeahn/api-client';

// After: Only bundles ts-rest client
import { createApiClient } from '@abeahn/api-client/client';
```

---

## @abeahn/storage

The storage package benefits significantly from granular imports to avoid bundling unused providers.

### Main Export (All Providers)

```typescript
import { createStorage, LocalStorageProvider, S3StorageProvider } from '@abeahn/storage';
```

**Warning:** Imports AWS SDK (~300KB) even if you only use local storage.

### Granular Exports (Recommended)

#### Types

Import only TypeScript interfaces:

```typescript
import type { StorageProvider, StorageConfig } from '@abeahn/storage/types';
```

#### Local Storage Provider

Import only local file system provider:

```typescript
import { LocalStorageProvider } from '@abeahn/storage/local';
```

**Bundle size:** ~5KB
**Use when:** Server-side file storage only.

#### S3 Storage Provider

Import only AWS S3 provider:

```typescript
import { S3StorageProvider } from '@abeahn/storage/s3';
```

**Bundle size:** ~305KB (includes AWS SDK)
**Use when:** Cloud storage with S3.

#### Factory

Import storage factory function:

```typescript
import { createStorage } from '@abeahn/storage/factory';
```

### Critical Example: Browser vs Server

**Browser (web app) - Avoid AWS SDK:**

```typescript
// WRONG: Bundles AWS SDK in browser (~300KB wasted)
import { LocalStorageProvider } from '@abeahn/storage';

// CORRECT: Only bundles local provider
import { LocalStorageProvider } from '@abeahn/storage/local';
```

**Server (Node.js) - Both providers OK:**

```typescript
// Server can import both efficiently
import { S3StorageProvider } from '@abeahn/storage/s3';
import { LocalStorageProvider } from '@abeahn/storage/local';
```

### Bundle Size Impact

| Import Style             | Bundle Size | Use Case                    |
| ------------------------ | ----------- | --------------------------- |
| Full (`@abeahn/storage`) | ~310KB      | Server using both providers |
| Local only (`/local`)    | ~5KB        | Local file storage only     |
| S3 only (`/s3`)          | ~305KB      | S3 cloud storage only       |
| Types only (`/types`)    | <1KB        | Type definitions only       |

---

## @abeahn/db

### Main Export (All Features)

```typescript
import { users, createDbClient, buildConnectionString } from '@abeahn/db';
```

### Granular Exports

#### Schema

Import only Drizzle schema definitions:

```typescript
import { users, sessions, schema } from '@abeahn/db/schema';
```

**Use when:** You only need table schemas for types or queries.

#### Client

Import only database client utilities:

```typescript
import { createDbClient, buildConnectionString } from '@abeahn/db/client';
```

**Use when:** You only need connection utilities.

### Example: Schema-Only Import

Useful for applications that only need type definitions:

```typescript
// Before: Imports client and connection utilities
import { users } from '@abeahn/db';

// After: Only imports schema
import { users } from '@abeahn/db/schema';
```

---

## Best Practices

### 1. Use Category Exports for UI Components

When you need multiple components from the same category:

```typescript
// Good: Import from category
import { Button, Card, Input } from '@abeahn/ui/components';

// Avoid: Import from main when only using one category
import { Button, Card, Input } from '@abeahn/ui';
```

### 2. Avoid Mixing Main and Secondary Imports

For consistency and clarity, don't mix import styles for the same package:

```typescript
// Bad: Mixing import styles
import { Button } from '@abeahn/ui';
import { useMediaQuery } from '@abeahn/ui/hooks';

// Good: Consistent style
import { Button } from '@abeahn/ui/components';
import { useMediaQuery } from '@abeahn/ui/hooks';
```

### 3. Storage Provider Imports Are Critical

Always use granular imports for storage providers to avoid bundling AWS SDK unnecessarily:

```typescript
// Critical for browser apps
import { LocalStorageProvider } from '@abeahn/storage/local';
```

### 4. Type-Only Imports

Use TypeScript's `type` keyword for type-only imports:

```typescript
import type { ApiClient } from '@abeahn/api-client/types';
import type { StorageProvider } from '@abeahn/storage/types';
```

### 5. Import What You Need

The more specific your imports, the better the tree-shaking:

```typescript
// Less specific: Imports entire category
import * from '@abeahn/ui/components';

// More specific: Imports only what you need
import { Button, Card } from '@abeahn/ui/components';
```

---

## TypeScript Configuration

Ensure your `tsconfig.json` supports package exports:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // or "node16" / "nodenext"
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

### Minimum Requirements

- **TypeScript:** 4.7+ (for package.json exports support)
- **Module Resolution:** `bundler`, `node16`, or `nodenext`

### Troubleshooting

If you see errors like `Cannot find module '@abeahn/ui/components'`:

1. Check TypeScript version: `tsc --version` (must be 4.7+)
2. Verify `moduleResolution` in tsconfig.json
3. Clear TypeScript cache: `rm -rf node_modules/.cache`
4. Rebuild packages: `pnpm build`

---

## Migration from v1.0.0

See [MIGRATION-1.1.0.md](./MIGRATION-1.1.0.md) for detailed migration guide and examples.

---

## Bundle Analysis

To measure the impact of optimized imports:

### Vite (Web App)

```bash
cd apps/web
pnpm build
pnpm vite-bundle-visualizer  # if installed
```

### Webpack

```bash
npx webpack-bundle-analyzer dist/stats.json
```

---

## Additional Resources

- [Versioning Policy](../VERSIONING.md)
- [Publishing Guide](./PUBLISHING.md)
- [Package CHANGELOGs](../packages/*/CHANGELOG.md)
- [Tree-Shaking Guide](https://webpack.js.org/guides/tree-shaking/)

---

## Questions or Issues?

- Report issues: https://github.com/abrahamahn/abe-stack/issues
- Documentation: https://github.com/abrahamahn/abe-stack#readme
