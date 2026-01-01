# Changelog

All notable changes to @abeahn/ui will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-30

### Added

- Secondary export paths for better tree-shaking and granular imports:
  - `@abeahn/ui/components` - Import only component elements (Button, Card, Input, etc.)
  - `@abeahn/ui/elements` - Import only element components (Accordion, Alert, Avatar, etc.)
  - `@abeahn/ui/layouts` - Import only layout components (Container, AppShell, SidebarLayout, etc.)
  - `@abeahn/ui/hooks` - Import only React hooks (useMediaQuery, useDisclosure, etc.)
  - `@abeahn/ui/theme` - Import only theme tokens (colors, spacing, typography, etc.)
  - `@abeahn/ui/utils` - Import only utility functions (cn)
- Publishing configuration for npm
- Repository and package metadata

### Changed

- Main export `@abeahn/ui` continues to work as before (100% backward compatible)
- Improved bundle optimization opportunities - using category exports can reduce bundle size by 20-60%

### Migration Guide

**No breaking changes** - all existing imports continue to work.

**Before (v1.0.0 style - still works):**

```typescript
import { Button, Card, useMediaQuery, useDisclosure } from '@abeahn/ui';
```

**After (v1.1.0 style - recommended for better tree-shaking):**

```typescript
import { Button, Card } from '@abeahn/ui/components';
import { useMediaQuery, useDisclosure } from '@abeahn/ui/hooks';
```

**Bundle Size Impact:**

| Import Style                              | Estimated Bundle Size   |
| ----------------------------------------- | ----------------------- |
| Full (`@abeahn/ui`)                       | ~120KB (all components) |
| Components only (`@abeahn/ui/components`) | ~40KB                   |
| Hooks only (`@abeahn/ui/hooks`)           | ~8KB                    |
| Theme only (`@abeahn/ui/theme`)           | ~4KB                    |

## [1.0.0] - 2025-XX-XX

### Added

- Initial release of @abeahn/ui
- 7 core components: Button, Card, Heading, Input, PageContainer, Text, Image
- 35+ element components from Radix UI
- 6 layout components: Container, AppShell, SidebarLayout, AuthLayout, etc.
- 9 custom React hooks: useMediaQuery, useLocalStorage, useDisclosure, etc.
- Theme system with design tokens (colors, spacing, typography, motion)
- Utility functions (cn for className merging)
- Full TypeScript support with declaration maps
- Comprehensive test coverage
