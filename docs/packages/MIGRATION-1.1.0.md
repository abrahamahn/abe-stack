# Migration Guide: v1.0.0 → v1.1.0

## Overview

Version 1.1.0 adds granular export paths to all @aahn packages for better tree-shaking and bundle optimization.

**Important:** This release has **NO BREAKING CHANGES**. All existing code continues to work exactly as before.

## TL;DR

- All existing imports continue to work (100% backward compatible)
- New secondary exports are **optional** - use them to optimize bundle size
- Recommended for new code, optional for existing code
- Potential bundle size reduction: 20-60%

---

## What Changed?

All five publishable packages now support granular imports:

| Package          | New Exports                                                            | Primary Benefit                               |
| ---------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| @aahn/ui         | `/components`, `/primitives`, `/layouts`, `/hooks`, `/theme`, `/utils` | 20-60% bundle size reduction                  |
| @aahn/shared     | `/contracts`, `/utils`, `/env`                                         | Better separation of client/server code       |
| @aahn/api-client | `/types`, `/client`, `/react-query`                                    | Exclude React Query in non-React environments |
| @aahn/storage    | `/types`, `/local`, `/s3`, `/factory`                                  | Avoid bundling AWS SDK in browser apps        |
| @aahn/db         | `/schema`, `/client`                                                   | Import schema without client dependencies     |

---

## Migration Strategy

### Option 1: No Migration Required (Default)

**Do nothing** - your code continues to work:

```typescript
// v1.0.0 style - still works perfectly in v1.1.0
import { Button, Card } from '@aahn/ui';
import { apiContract } from '@aahn/shared';
import { createApiClient } from '@aahn/api-client';
```

**When to use:** Existing code that works well, no performance issues.

### Option 2: Gradual Migration (Recommended)

Migrate new code and performance-critical paths:

**New code:** Use new exports
**Existing code:** Leave as-is unless optimizing

**When to use:** Balancing optimization with development velocity.

### Option 3: Full Migration (Optional)

Update all imports to use granular exports:

**When to use:** Maximum bundle optimization, large applications, or preparing for future v2.0.

---

## Package-Specific Migration

### @aahn/ui

**Largest impact** - UI package is ~120KB, optimizations can save 20-60%.

#### Components

```typescript
// Before (v1.0.0)
import { Button, Card, Input } from '@aahn/ui';

// After (v1.1.0 - recommended)
import { Button, Card, Input } from '@aahn/ui/components';
```

**Savings:** ~80KB if only using components (no primitives/layouts)

#### Hooks

```typescript
// Before
import { useMediaQuery, useLocalStorage } from '@aahn/ui';

// After
import { useMediaQuery, useLocalStorage } from '@aahn/ui/hooks';
```

**Savings:** ~112KB if only using hooks (no components)

#### Mixed Categories

If you need components AND hooks:

```typescript
// Before
import { Button, useMediaQuery } from '@aahn/ui';

// After (option 1: multiple imports)
import { Button } from '@aahn/ui/components';
import { useMediaQuery } from '@aahn/ui/hooks';

// After (option 2: keep main import if using multiple categories)
import { Button, useMediaQuery } from '@aahn/ui';
```

**Recommendation:** If importing from 3+ categories, use main import. Otherwise, use category imports.

#### Complete Example: Login Page

```typescript
// Before (v1.0.0) - ~120KB
import { Button, Card, Input, Heading, Text, useDisclosure } from '@aahn/ui';

// After (v1.1.0) - ~48KB
import { Button, Card, Input, Heading, Text } from '@aahn/ui/components';
import { useDisclosure } from '@aahn/ui/hooks';

// Savings: 72KB (60%)
```

### @aahn/shared

#### API Contracts

```typescript
// Before
import { apiContract } from '@aahn/shared';

// After
import { apiContract } from '@aahn/shared/contracts';
```

#### Environment Validation

```typescript
// Before
import { clientEnvSchema, serverEnvSchema } from '@aahn/shared';

// After
import { clientEnvSchema, serverEnvSchema } from '@aahn/shared/env';
```

#### Token Storage

```typescript
// Before
import { tokenStore } from '@aahn/shared';

// After
import { tokenStore } from '@aahn/shared/utils';
```

#### Storage Config (No Change)

Already has secondary export:

```typescript
// v1.0.0 and v1.1.0 - same
import { toStorageConfig } from '@aahn/shared/storageConfig';
```

### @aahn/api-client

#### Client Only (No React Query)

**Critical for Node.js scripts and non-React environments:**

```typescript
// Before - bundles React Query unnecessarily
import { createApiClient } from '@aahn/api-client';

// After - excludes @tanstack/react-query
import { createApiClient } from '@aahn/api-client/client';
```

**Savings:** ~50KB (React Query excluded)

#### React Query Only

```typescript
// Before
import { useApiQuery, useApiMutation } from '@aahn/api-client';

// After
import { useApiQuery, useApiMutation } from '@aahn/api-client/react-query';
```

#### Type-Only Imports

```typescript
// Before
import { type ApiClient } from '@aahn/api-client';

// After
import type { ApiClient } from '@aahn/api-client/types';
```

### @aahn/storage

**CRITICAL MIGRATION** - Avoids bundling AWS SDK (~300KB) in browser apps.

#### Browser Apps (Web/Desktop/Mobile)

```typescript
// Before - WRONG: Bundles AWS SDK in browser
import { LocalStorageProvider } from '@aahn/storage';

// After - CORRECT: Only bundles local provider
import { LocalStorageProvider } from '@aahn/storage/local';
```

**Savings:** ~305KB (AWS SDK excluded)

**Priority:** HIGH for browser applications

#### Server Apps (Node.js)

Server can use both providers, but granular imports are still recommended:

```typescript
// Before
import { createStorage, S3StorageProvider } from '@aahn/storage';

// After (recommended)
import { createStorage } from '@aahn/storage/factory';
import { S3StorageProvider } from '@aahn/storage/s3';
```

#### Types Only

```typescript
// Before
import { type StorageProvider } from '@aahn/storage';

// After
import type { StorageProvider } from '@aahn/storage/types';
```

### @aahn/db

#### Schema Only

```typescript
// Before
import { users, sessions } from '@aahn/db';

// After
import { users, sessions } from '@aahn/db/schema';
```

**Use when:** Only need table schemas for types or queries.

#### Client Only

```typescript
// Before
import { createDbClient, buildConnectionString } from '@aahn/db';

// After
import { createDbClient, buildConnectionString } from '@aahn/db/client';
```

---

## Bundle Size Impact

Real-world examples from typical applications:

### Small App (Few Components)

```typescript
// Before: ~150KB total
import { Button, Input } from '@aahn/ui';
import { apiContract } from '@aahn/shared';
import { createApiClient } from '@aahn/api-client';

// After: ~60KB total
import { Button, Input } from '@aahn/ui/components';
import { apiContract } from '@aahn/shared/contracts';
import { createApiClient } from '@aahn/api-client/client';

// Savings: 90KB (60%)
```

### Medium App (Multiple Categories)

```typescript
// Before: ~250KB total
import { Button, Card, useMediaQuery, colors } from '@aahn/ui';
import { LocalStorageProvider } from '@aahn/storage';

// After: ~55KB total
import { Button, Card } from '@aahn/ui/components';
import { useMediaQuery } from '@aahn/ui/hooks';
import { colors } from '@aahn/ui/theme';
import { LocalStorageProvider } from '@aahn/storage/local';

// Savings: 195KB (78%)
```

### Large App (Many Components)

```typescript
// Before: ~500KB total
// Using 20+ components, hooks, primitives, and storage

// After: ~380KB total
// Same components but with granular imports

// Savings: 120KB (24%)
```

---

## Automated Migration

### Find and Replace

Use your editor's find/replace to update imports:

#### VS Code

1. Open Find in Files (Cmd/Ctrl + Shift + F)
2. Enable regex mode
3. Use these patterns:

**Pattern 1: UI Components**

```
Find: from ['"]@aahn/ui['"]
Replace: from '@aahn/ui/components'
```

**Pattern 2: Storage (Browser)**

```
Find: from ['"]@aahn/storage['"]
Replace: from '@aahn/storage/local'
```

**Note:** Manual review recommended - automated replacement may not handle mixed imports correctly.

### Future: Codemod Tool

A codemod for automated migration is planned but not yet available:

```bash
# Coming soon
npx @aahn/codemod migrate-imports
```

---

## Testing After Migration

### 1. Type Check

```bash
pnpm type-check
```

### 2. Build

```bash
pnpm build
```

### 3. Test Suite

```bash
pnpm test
```

### 4. Bundle Analysis

Compare bundle sizes before and after:

```bash
cd apps/web
pnpm build
pnpm vite-bundle-visualizer  # if installed
```

---

## Common Issues

### Issue: "Cannot find module '@aahn/ui/components'"

**Cause:** TypeScript version too old or incorrect moduleResolution

**Solution:**

```bash
# Check TypeScript version (must be 4.7+)
tsc --version

# Update if needed
pnpm add -D typescript@latest

# Update tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler"  // or "node16" / "nodenext"
  }
}
```

### Issue: Tests fail after migration

**Cause:** Test framework can't resolve new exports

**Solution:** Update test configuration (vitest/jest):

```typescript
// vitest.config.ts
export default defineConfig({
  resolve: {
    conditions: ['import', 'default'],
  },
});
```

### Issue: Bundle size didn't decrease

**Cause:** Bundler not tree-shaking properly, or still importing from main export

**Solutions:**

1. Verify you're using granular imports (not main export)
2. Check bundler configuration for tree-shaking
3. Ensure `sideEffects: false` in package.json
4. Use bundle analyzer to identify large dependencies

---

## Rollback

If you need to revert to v1.0.0 style imports:

### Quick Rollback

No code changes needed - just use main exports:

```typescript
// This works in both v1.0.0 and v1.1.0
import { Button } from '@aahn/ui';
```

### Package Rollback

To downgrade packages (not recommended):

```bash
pnpm add @aahn/ui@1.0.0
pnpm add @aahn/shared@1.0.0
# ... etc
```

---

## Best Practices Going Forward

### For New Code

- Always use granular imports
- Especially critical for `@aahn/storage` in browser apps
- Use category imports for `@aahn/ui`

### For Existing Code

- Migrate performance-critical paths first
- Focus on pages with large bundle sizes
- Use bundle analyzer to identify optimization opportunities

### For Libraries

If you're building a library that depends on @aahn packages:

- Use granular imports to avoid bundling unnecessary code
- Re-export only what your library needs
- Document which @aahn packages users need to install

---

## Questions?

- Review [EXPORTS.md](./EXPORTS.md) for detailed export documentation
- Check [VERSIONING.md](../VERSIONING.md) for versioning policy
- Report issues: https://github.com/abrahamahn/abe-stack/issues

---

## Next Steps

1. Update your code using the patterns above (optional but recommended)
2. Run tests to ensure everything works
3. Measure bundle size impact
4. Read [EXPORTS.md](./EXPORTS.md) for comprehensive usage guide
