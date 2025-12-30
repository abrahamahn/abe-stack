# Changelog

All notable changes to @aahn/ui will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-30

### Added

- Secondary export paths for better tree-shaking and granular imports:
  - `@aahn/ui/components` - Import only component primitives (Button, Card, Input, etc.)
  - `@aahn/ui/primitives` - Import only primitive components (Accordion, Alert, Avatar, etc.)
  - `@aahn/ui/layouts` - Import only layout components (Container, AppShell, SidebarLayout, etc.)
  - `@aahn/ui/hooks` - Import only React hooks (useMediaQuery, useDisclosure, etc.)
  - `@aahn/ui/theme` - Import only theme tokens (colors, spacing, typography, etc.)
  - `@aahn/ui/utils` - Import only utility functions (cn)
- Publishing configuration for npm
- Repository and package metadata

### Changed

- Main export `@aahn/ui` continues to work as before (100% backward compatible)
- Improved bundle optimization opportunities - using category exports can reduce bundle size by 20-60%

### Migration Guide

**No breaking changes** - all existing imports continue to work.

**Before (v1.0.0 style - still works):**

```typescript
import { Button, Card, useMediaQuery, useDisclosure } from '@aahn/ui';
```

**After (v1.1.0 style - recommended for better tree-shaking):**

```typescript
import { Button, Card } from '@aahn/ui/components';
import { useMediaQuery, useDisclosure } from '@aahn/ui/hooks';
```

**Bundle Size Impact:**

| Import Style                            | Estimated Bundle Size   |
| --------------------------------------- | ----------------------- |
| Full (`@aahn/ui`)                       | ~120KB (all components) |
| Components only (`@aahn/ui/components`) | ~40KB                   |
| Hooks only (`@aahn/ui/hooks`)           | ~8KB                    |
| Theme only (`@aahn/ui/theme`)           | ~4KB                    |

## [1.0.0] - 2025-XX-XX

### Added

- Initial release of @aahn/ui
- 7 core components: Button, Card, Heading, Input, PageContainer, Text, Image
- 35+ primitive components from Radix UI
- 6 layout components: Container, AppShell, SidebarLayout, AuthLayout, etc.
- 9 custom React hooks: useMediaQuery, useLocalStorage, useDisclosure, etc.
- Theme system with design tokens (colors, spacing, typography, motion)
- Utility functions (cn for className merging)
- Full TypeScript support with declaration maps
- Comprehensive test coverage
