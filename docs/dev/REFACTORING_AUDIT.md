# Refactoring Audit Report

> **Generated:** 2026-01-03
> **Scope:** `apps/web` and `packages/*`
> **Status:** Action Required

---

## Executive Summary

This audit identifies 40+ refactoring opportunities across the ABE Stack codebase. The findings are organized by priority and include specific file paths, line numbers, and actionable recommendations.

### Quick Stats

| Metric                  | apps/web    | packages                |
| ----------------------- | ----------- | ----------------------- |
| Source Files            | 27          | 75                      |
| Test Files              | 20          | 69                      |
| Test Coverage           | ~74%        | ~92% (3 packages at 0%) |
| Largest File            | 1,527 lines | 279 lines               |
| Code Duplication Issues | 12 patterns | 6 patterns              |

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [High Priority](#2-high-priority)
3. [Medium Priority](#3-medium-priority)
4. [Low Priority](#4-low-priority)
5. [Todo Checklist](#5-todo-checklist)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Critical Issues

### 1.1 Missing Test Coverage - 3 Packages Have Zero Tests

**Impact:** High - No safety net for refactoring or bug fixes

| Package               | Source Files | Test Files | Risk Level |
| --------------------- | ------------ | ---------- | ---------- |
| `packages/api-client` | 4            | **0**      | HIGH       |
| `packages/db`         | 3            | **0**      | HIGH       |
| `packages/storage`    | 7            | **0**      | HIGH       |

**Files to create:**

- [ ] `packages/api-client/src/__tests__/client.test.ts`
- [ ] `packages/api-client/src/__tests__/react-query.test.ts`
- [ ] `packages/db/src/__tests__/client.test.ts`
- [ ] `packages/db/src/__tests__/schema.test.ts`
- [ ] `packages/storage/src/__tests__/localStorageProvider.test.ts`
- [ ] `packages/storage/src/__tests__/s3StorageProvider.test.ts`
- [ ] `packages/storage/src/__tests__/storageFactory.test.ts`

---

### 1.2 USER_ROLES Order Mismatch

**Impact:** Medium - Could cause subtle bugs in role comparisons

**Files:**

- `packages/db/src/schema/users.ts` (line 4): `['admin', 'moderator', 'user']`
- `packages/shared/src/contracts/index.ts` (line 7): `['user', 'admin', 'moderator']`

**Issue:** Arrays have different ordering. While functionally equivalent for most uses, this could cause issues with:

- Array index-based comparisons
- Role hierarchy assumptions
- Serialization consistency

**Recommendation:** Align both to same order. Prefer DB as source of truth:

```typescript
// Both files should use:
export const USER_ROLES = ['user', 'admin', 'moderator'] as const;
```

---

### 1.3 Large Component Files

**Impact:** Medium - Hard to maintain, test, and understand

| File                                          | Lines | Primary Issue                             |
| --------------------------------------------- | ----- | ----------------------------------------- |
| `apps/web/src/features/demo/registry.tsx`     | 1,527 | Data-heavy registry, no separation        |
| `apps/web/src/features/demo/DemoShell.tsx`    | 718   | 5+ state concerns, mixed responsibilities |
| `packages/ui/src/elements/ResizablePanel.tsx` | 279   | Multiple exported components              |
| `packages/ui/src/elements/Dialog.tsx`         | 279   | Complex composition pattern               |
| `packages/ui/src/elements/Select.tsx`         | 234   | Complex keyboard/mouse handling           |

---

## 2. High Priority

### 2.1 Token Management Duplication

**Files:**

- `packages/api-client/src/client.ts` (lines 34-35)
- `packages/api-client/src/react-query.ts` (lines 35-37)

**Current Code (duplicated):**

```typescript
// client.ts
const token = config.getToken?.();
if (token) headers.set('Authorization', `Bearer ${token}`);

// react-query.ts
const token = getToken?.();
const nextHeaders = new Headers(headers);
if (token) nextHeaders.set('Authorization', `Bearer ${token}`);
```

**Recommendation:** Extract to `packages/shared/src/utils/index.ts`:

```typescript
export function addAuthHeader(headers: Headers, token?: string | null): Headers {
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}
```

---

### 2.2 Inconsistent Export Patterns in UI Package

**Issue:** Mixed default/named exports across components

**Files with default exports (inconsistent):**

- `packages/ui/src/components/Button.tsx` (line 28-29)
- `packages/ui/src/components/Input.tsx`
- `packages/ui/src/elements/Tabs.tsx`

**All other components:** Named exports only

**Recommendation:** Remove default exports for consistency:

```typescript
// Before
export const Button = ...;
export default Button;

// After
export const Button = ...;
// Remove: export default Button;
```

---

### 2.3 Inline Styles Overuse

**Impact:** Hard to maintain, no CSS caching, inconsistent styling

**Scope:** 150+ instances across `apps/web`

**Common patterns found:**

```typescript
style={{ display: 'flex', gap: '8px' }}
style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
style={{ display: 'grid', gap: 12 }}
style={{ padding: '16px' }}
style={{ marginBottom: '6px' }}
```

**Files most affected:**

- `apps/web/src/features/demo/DemoShell.tsx` (50+ instances)
- `apps/web/src/features/demo/registry.tsx` (30+ instances)
- `apps/web/src/features/auth/pages/Login.tsx` (15+ instances)
- `apps/web/src/pages/Home.tsx` (10+ instances)

**Recommendation:** Create CSS utility classes or style constants:

```typescript
// Create: apps/web/src/styles/utils.ts
export const flexRow = { display: 'flex', flexDirection: 'row' as const };
export const flexCol = { display: 'flex', flexDirection: 'column' as const };
export const gap8 = { gap: '8px' };
export const gap16 = { gap: '16px' };
```

Or use CSS classes in `apps/web/src/styles/global.css`:

```css
.flex-row {
  display: flex;
  flex-direction: row;
}
.flex-col {
  display: flex;
  flex-direction: column;
}
.gap-8 {
  gap: 8px;
}
.gap-16 {
  gap: 16px;
}
```

---

### 2.4 Weak Type Safety in ApiProvider

**File:** `apps/web/src/providers/ApiProvider.tsx` (line 10)

**Current:**

```typescript
type ApiContextValue = Record<string, unknown>; // Loses all type information!
```

**Recommendation:**

```typescript
import type { ReactQueryClient } from '@abe-stack/api-client';

type ApiContextValue = ReturnType<typeof createReactQueryClient>;
```

---

### 2.5 dangerouslySetInnerHTML Usage

**File:** `apps/web/src/features/demo/DemoShell.tsx` (line 546)

**Current:**

```tsx
<div dangerouslySetInnerHTML={{ __html: parseMarkdown(docs) }} />
```

**Security Risk:** XSS vulnerabilities if markdown contains malicious content

**Recommendation:**

1. Use a safe markdown renderer like `react-markdown`
2. Or sanitize HTML with DOMPurify before rendering:

```typescript
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(docs)) }} />
```

---

## 3. Medium Priority

### 3.1 DemoShell.tsx Should Be Split

**File:** `apps/web/src/features/demo/DemoShell.tsx` (718 lines)

**Current responsibilities:**

1. Theme management (lines 80-98)
2. Keyboard shortcuts (lines 119-146)
3. Pane configuration (lines 104-112, 155-160)
4. Category navigation (lines 114-116)
5. Component selection (line 56)
6. Documentation rendering (lines 536-575)
7. Layout rendering (entire render function)

**Recommended extraction:**

```
apps/web/src/features/demo/
├── DemoShell.tsx (200 lines) - Main orchestrator
├── hooks/
│   ├── useDemoTheme.ts - Theme state and cycling
│   ├── useDemoKeyboard.ts - Keyboard shortcuts
│   └── useDemoPanes.ts - Pane configuration
├── components/
│   ├── DemoToolbar.tsx - Bottom toolbar
│   ├── DemoCategorySidebar.tsx - Category buttons
│   ├── DemoComponentList.tsx - Component selection panel
│   ├── DemoDocPanel.tsx - Documentation panel
│   └── DemoPreviewArea.tsx - Main preview area
└── index.ts - Re-exports
```

---

### 3.2 registry.tsx Should Be Split by Category

**File:** `apps/web/src/features/demo/registry.tsx` (1,527 lines)

**Current structure:** All component demos in single object

**Recommended extraction:**

```
apps/web/src/features/demo/registry/
├── index.ts - Main registry export, combines all
├── components.tsx - Box, Button, Card, Input, Spinner, Layout, Badge
├── elements.tsx - Accordion, Alert, Avatar, etc.
├── layouts.tsx - Container, AuthLayout, PageContainer, etc.
└── types.ts - Shared types (ComponentDemo, etc.)
```

---

### 3.3 Potential Circular Dependency Risk

**Current cross-references:**

- `packages/ui/src/elements/Dialog.tsx` imports `../components/FocusTrap`
- `packages/ui/src/components/ProtectedRoute.tsx` imports `../elements/Text`

**Recommendation:** Define clear dependency hierarchy:

```
components/ → can import from → elements/, hooks/, utils/
elements/   → can import from → hooks/, utils/
hooks/      → can import from → utils/
utils/      → no internal imports
```

Consider moving `FocusTrap` to `elements/` or creating `primitives/` folder.

---

### 3.4 Inconsistent Package Naming

**Mixed namespace usage:**

- Package names: `abeahn-*` prefix
- Import paths: Sometimes `@abe-stack/*`

**Examples:**

```typescript
// packages/storage/src/configFromEnv.ts
import type { ServerEnv } from '@abe-stack/shared';

// packages/ui/src/components/Toaster.tsx
import { toastStore } from 'abeahn-shared';
```

**Recommendation:** Standardize on `@abe-stack/*` for all imports via tsconfig paths.

---

### 3.5 Form Input Pattern Should Be Extracted

**File:** `apps/web/src/features/auth/pages/Login.tsx` (lines 47-75)

**Repeated pattern:**

```tsx
<div style={{ marginBottom: '16px' }}>
  <label style={{ display: 'block', marginBottom: '6px' }}>Email</label>
  <Input type="email" style={{ width: '100%' }} />
</div>
```

**Recommendation:** Create `FormField` component in `packages/ui`:

```tsx
// packages/ui/src/elements/FormField.tsx
export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label className="form-field__label">
        {label}
        {required && <span className="form-field__required">*</span>}
      </label>
      {children}
      {error && <span className="form-field__error">{error}</span>}
    </div>
  );
}
```

---

### 3.6 Missing vitest Configuration for Some Packages

**Packages without vitest.config.ts:**

- `packages/api-client/`
- `packages/db/`
- `packages/storage/`
- `packages/shared/` (runs tests but no config file)

**Recommendation:** Create base config in `config/vitest.base.ts` and extend in each package.

---

## 4. Low Priority

### 4.1 Storage Key Normalization Duplication

**Files:**

- `packages/storage/src/localStorageProvider.ts` (line 12)
- `packages/storage/src/s3StorageProvider.ts` (line 28)

**Current:**

```typescript
// localStorageProvider.ts
const safeKey = key.replace(/^\//, '').replace(/\.\./g, '');

// s3StorageProvider.ts
const key = params.key.replace(/^\//, '');
```

**Recommendation:** Extract to utility:

```typescript
// packages/storage/src/utils/normalizeKey.ts
export function normalizeStorageKey(key: string, stripParentRefs = true): string {
  let normalized = key.replace(/^\//, '');
  if (stripParentRefs) {
    normalized = normalized.replace(/\.\./g, '');
  }
  return normalized;
}
```

---

### 4.2 Unnecessary React Imports

**Files importing React unnecessarily (React 17+ JSX transform):**

- `apps/web/src/main.tsx` (line 1)
- `apps/web/src/app/root.tsx` (line 2)
- `apps/web/src/app/providers.tsx` (line 3)
- `apps/web/src/features/demo/registry.tsx` (line 53)
- Several others

**Recommendation:** Remove `import React from 'react'` unless explicitly using `React.*` methods.

---

### 4.3 Missing Path Aliases in Non-UI Packages

**Current:** Only `packages/ui` uses path aliases

**Recommendation:** Add to other packages:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### 4.4 Inconsistent Props Type Definitions

**Pattern variations found:**

```typescript
// Pattern A: interface
export interface ButtonProps {}

// Pattern B: type
type ButtonProps = {};

// Pattern C: inline with HTML extension
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

// Pattern D: ComponentPropsWithoutRef
type CardRootProps = ComponentPropsWithoutRef<'div'> & {};
```

**Recommendation:** Standardize:

- Use `interface` for component props
- Use `ComponentPropsWithoutRef<'element'>` for HTML element extensions
- Always export Props types

---

### 4.5 Void Expressions for Unused Handlers

**Files with void expressions:**

- `apps/web/src/features/demo/UI.tsx` (lines 63-65, 71-73)
- Pattern: `void checked;`

**Recommendation:** Use underscore prefix for unused params:

```typescript
// Before
onChange={(checked) => { void checked; }}

// After
onChange={(_checked) => { /* intentionally unused */ }}
```

---

### 4.6 ProtectedRoute in UI Package

**File:** `packages/ui/src/components/ProtectedRoute.tsx`

**Issue:** App-specific component in shared UI package

**Recommendation:** Consider:

1. Move to `apps/web/src/components/`
2. Or make more generic (accept auth check function as prop)

---

## 5. Todo Checklist

### Critical Priority

- [ ] Add tests for `packages/api-client` (4 source files)
- [ ] Add tests for `packages/db` (3 source files)
- [ ] Add tests for `packages/storage` (7 source files)
- [ ] Align USER_ROLES order between db and shared packages

### High Priority

- [ ] Extract token management to shared utility
- [ ] Remove default exports from Button, Input, Tabs
- [ ] Fix ApiContextValue type in ApiProvider.tsx
- [ ] Replace dangerouslySetInnerHTML with safe markdown renderer
- [ ] Create CSS utility classes for common inline styles

### Medium Priority

- [ ] Split DemoShell.tsx into smaller components
  - [ ] Extract useDemoTheme hook
  - [ ] Extract useDemoKeyboard hook
  - [ ] Extract useDemoPanes hook
  - [ ] Create DemoToolbar component
  - [ ] Create DemoCategorySidebar component
  - [ ] Create DemoComponentList component
  - [ ] Create DemoDocPanel component
- [ ] Split registry.tsx by category
  - [ ] Create registry/components.tsx
  - [ ] Create registry/elements.tsx
  - [ ] Create registry/layouts.tsx
- [ ] Resolve circular dependency risk in UI package
- [ ] Standardize package naming convention
- [ ] Create FormField component
- [ ] Add vitest.config.ts to missing packages

### Low Priority

- [ ] Extract storage key normalization utility
- [ ] Remove unnecessary React imports
- [ ] Add path aliases to non-UI packages
- [ ] Standardize Props type definition pattern
- [ ] Replace void expressions with underscore params
- [ ] Review ProtectedRoute location

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Goal:** Establish testing baseline and fix critical issues

1. **Day 1-2:** Add test infrastructure
   - Create `packages/api-client/vitest.config.ts`
   - Create `packages/db/vitest.config.ts`
   - Create `packages/storage/vitest.config.ts`
   - Add base test files for each package

2. **Day 3:** Fix type issues
   - Align USER_ROLES order
   - Fix ApiContextValue type
   - Extract token management utility

3. **Day 4-5:** Security fixes
   - Replace dangerouslySetInnerHTML
   - Review and sanitize any other innerHTML usage

### Phase 2: Consistency (Week 2)

**Goal:** Standardize patterns across codebase

1. **Day 1-2:** Export pattern standardization
   - Remove default exports from UI components
   - Ensure all Props types are exported
   - Document export conventions

2. **Day 3-4:** Style consolidation
   - Create CSS utility classes
   - Refactor most common inline style patterns
   - Document styling conventions

3. **Day 5:** Package naming
   - Standardize import paths
   - Update tsconfig paths if needed

### Phase 3: Refactoring (Week 3)

**Goal:** Break down large components

1. **Day 1-3:** DemoShell.tsx refactoring
   - Extract hooks
   - Extract sub-components
   - Update tests

2. **Day 4-5:** registry.tsx refactoring
   - Split by category
   - Update imports
   - Verify all demos still work

### Phase 4: Polish (Week 4)

**Goal:** Address remaining low-priority items

1. Clean up unused imports
2. Add path aliases
3. Standardize Props patterns
4. Document architectural decisions
5. Create component templates

---

## Appendix: Files Quick Reference

### Files Requiring Immediate Attention

```
# Critical - Missing Tests
packages/api-client/src/__tests__/  (create directory)
packages/db/src/__tests__/          (create directory)
packages/storage/src/__tests__/     (create directory)

# High Priority - Type/Security Issues
apps/web/src/providers/ApiProvider.tsx          (line 10: fix type)
apps/web/src/features/demo/DemoShell.tsx        (line 546: fix innerHTML)
packages/shared/src/contracts/index.ts          (line 7: verify order)
packages/db/src/schema/users.ts                 (line 4: align order)

# High Priority - Export Consistency
packages/ui/src/components/Button.tsx           (remove default export)
packages/ui/src/components/Input.tsx            (remove default export)
packages/ui/src/elements/Tabs.tsx               (remove default export)
```

### Files for Splitting

```
# Large Components
apps/web/src/features/demo/DemoShell.tsx        (718 lines → ~7 files)
apps/web/src/features/demo/registry.tsx         (1527 lines → ~4 files)

# Complex UI Elements
packages/ui/src/elements/ResizablePanel.tsx     (279 lines)
packages/ui/src/elements/Dialog.tsx             (279 lines)
packages/ui/src/elements/Select.tsx             (234 lines)
```

---

_Last updated: 2026-01-03_
