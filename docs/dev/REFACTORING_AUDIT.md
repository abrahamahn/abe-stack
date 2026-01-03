# Refactoring Audit Report

> **Generated:** 2026-01-03
> **Scope:** `apps/web` and `packages/*`
> **Status:** ✅ Complete

---

## Executive Summary

This audit identified 40+ refactoring opportunities across the ABE Stack codebase. **All items have been addressed.**

### Quick Stats (Updated)

| Metric                  | Before           | After               |
| ----------------------- | ---------------- | ------------------- |
| Test Coverage           | 3 packages at 0% | All packages tested |
| Largest File            | 1,527 lines      | ~300 lines (split)  |
| Code Duplication Issues | 18 patterns      | 0 patterns          |
| Type Safety Issues      | 3 critical       | 0                   |

---

## Completed Items

### Critical Priority ✅

- [x] Add tests for `packages/api-client` - Tests added
- [x] Add tests for `packages/db` - Tests added
- [x] Add tests for `packages/storage` - Tests added
- [x] Align USER_ROLES order between db and shared packages

### High Priority ✅

- [x] Extract token management to shared utility (`addAuthHeader` in shared/utils)
- [x] Remove default exports from Button, Input, Tabs (already using named exports)
- [x] Fix ApiContextValue type in ApiProvider.tsx (uses `ReactQueryClientInstance`)
- [x] Replace dangerouslySetInnerHTML with DOMPurify sanitization
- [x] Create CSS utility classes for common inline styles (`apps/web/src/styles/utilities.css`)

### Medium Priority ✅

- [x] Split DemoShell.tsx into smaller components
  - [x] Extract useDemoTheme hook
  - [x] Extract useDemoKeyboard hook
  - [x] Extract useDemoPanes hook
  - [x] Create DemoToolbar component
  - [x] Create DemoCategorySidebar component
  - [x] Create DemoComponentList component
  - [x] Create DemoDocPanel component
  - [x] Create DemoPreviewArea component
- [x] Split registry.tsx by category
  - [x] Create registry/componentRegistry.tsx
  - [x] Create registry/elementRegistry.tsx
  - [x] Create registry/layoutRegistry.tsx
- [x] Resolve circular dependency risk in UI package (FocusTrap moved to elements/)
- [x] Standardize package naming convention (dual naming is intentional: `abeahn-*` for npm, `@abe-stack/*` for TS aliases)
- [x] Create FormField component (`packages/ui/src/elements/FormField.tsx`)
- [x] Add vitest.config.ts to missing packages

### Low Priority ✅

- [x] Extract storage key normalization utility (`packages/storage/src/utils/normalizeKey.ts`)
- [x] Remove unnecessary React imports (cleaned up main.tsx, Card.tsx, Toaster.tsx, desktop files)
- [x] Add path aliases to non-UI packages (N/A - small packages don't need internal aliases)
- [x] Standardize Props type definition pattern (all use `type` instead of `interface`)
- [x] Replace void expressions with underscore params
- [x] Review ProtectedRoute location (made generic with props-based auth check)

---

## Architecture Decisions

### Component Hierarchy (packages/ui)

```
layouts/      → Full page layouts (AppShell, SidebarLayout, etc.)
components/   → Composed UI components (Button, Input, Card, etc.)
elements/     → Primitive UI elements (Text, Heading, Badge, etc.)
hooks/        → Reusable React hooks
utils/        → Utility functions
theme/        → Theme provider and tokens
```

### Import Rules

```
layouts/    → can import from → components/, elements/, hooks/, utils/
components/ → can import from → elements/, hooks/, utils/
elements/   → can import from → hooks/, utils/
hooks/      → can import from → utils/
utils/      → no internal imports
```

### Package Naming Convention

- **npm package names:** `abeahn-*` (e.g., `abeahn-ui`, `abeahn-shared`)
- **TypeScript path aliases:** `@abe-stack/*` (e.g., `@abe-stack/ui`, `@abe-stack/shared`)

This dual naming is intentional - npm names are for publishing, TS aliases are for developer ergonomics.

---

## Files Reference

### Key Refactored Files

```
# DemoShell Split
apps/web/src/features/demo/
├── DemoShell.tsx (orchestrator)
├── hooks/
│   ├── useDemoTheme.ts
│   ├── useDemoKeyboard.ts
│   └── useDemoPanes.ts
├── components/
│   ├── DemoToolbar.tsx
│   ├── DemoCategorySidebar.tsx
│   ├── DemoComponentList.tsx
│   ├── DemoDocPanel.tsx
│   └── DemoPreviewArea.tsx
└── registry/
    ├── index.ts
    ├── componentRegistry.tsx
    ├── elementRegistry.tsx
    └── layoutRegistry.tsx

# Circular Dependency Fix
packages/ui/src/elements/FocusTrap.tsx (moved from components/)

# Shared Utilities
packages/shared/src/utils/index.ts (addAuthHeader)
packages/storage/src/utils/normalizeKey.ts

# CSS Utilities
apps/web/src/styles/utilities.css (comprehensive utility classes)
```

---

_Last updated: 2026-01-03_
_Status: All refactoring items complete_
