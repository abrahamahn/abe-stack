# UI Package TODO - Improvement Suggestions

Generated: 2026-01-01
Last Review: 2026-01-04

## Completed

### File Reorganization (2026-01-04)

- [x] Moved Image.tsx and Card.tsx from elements/ to components/ (have state/compound patterns)
- [x] Moved Toaster.tsx from components/ to elements/ (simple wrapper)
- [x] Moved ResizablePanel.tsx from components/ to layouts/shells/
- [x] Moved ProtectedRoute.tsx from components/ to layouts/layers/
- [x] Moved AuthLayout.tsx from shells/ to containers/ (card-like container)
- [x] Set up path aliases in tsconfig (@components, @elements, @hooks, @layouts, @styles, @test, @theme, @utils)
- [x] Moved test files to match new source locations
- [x] Updated docs to match new file locations

### Testing Infrastructure (2026-01-01)

- [x] Installed modern React testing stack (user-event, msw, vitest-axe)
- [x] Enhanced 21+ element component tests with comprehensive coverage
- [x] Found and fixed Image component bug through TDD (state reset on src change)
- [x] 717+ tests passing across all UI components

## High Priority

### 1. Missing Tests for New Layouts

**Status:** Partially complete

**Files needing test coverage:**

- `packages/ui/src/layouts/shells/__tests__/LeftSidebarLayout.test.tsx` - Needs tests
- `packages/ui/src/layouts/shells/__tests__/RightSidebarLayout.test.tsx` - Needs tests
- `packages/ui/src/layouts/layers/__tests__/ProtectedRoute.test.tsx` - Has tests

**Test Coverage Should Include:**

- Basic rendering
- Slot content renders correctly
- Custom size props work
- className and style props forwarding
- ref forwarding
- Collapse/expand behavior (if applicable)

---

### 2. Accessibility: Keyboard Support for ResizablePanel

**File:** `packages/ui/src/layouts/shells/ResizablePanel.tsx`

**Implementation:**

```tsx
// Add to ResizableSeparator component
<div
  // ... existing props
  tabIndex={0}
  onKeyDown={(e) => {
    const step = 5; // 5% steps
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onResize?.(-step);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onResize?.(step);
    }
  }}
  aria-label="Resize panels"
/>
```

**Also Update:**

- Tests to verify keyboard interaction
- Documentation to reflect new feature

---

## Medium Priority

### 3. Split Large Demo Registry File

**Current Issue:** `apps/web/src/features/demo/registry.tsx` is 1500+ lines

**Proposed Structure:**

```
apps/web/src/features/demo/registry/
  ├── index.ts          # Re-exports and aggregates
  ├── elements.tsx      # Element demos
  ├── components.tsx    # Component demos
  └── layouts.tsx       # Layout demos
```

**Benefits:**

- Better organization
- Easier to find components
- Potential for code-splitting

---

### 4. Performance: Lazy Load Registry

**File:** `apps/web/src/features/demo/registry.tsx`

**Issue:** All component demos load immediately

**Proposed Solution:**

```tsx
const registries = {
  elements: () => import('./elements'),
  components: () => import('./components'),
  layouts: () => import('./layouts'),
};

export const getComponentsByCategory = async (category: string) => {
  const registry = await registries[category]();
  return Object.values(registry.default);
};
```

---

## Low Priority / Nice-to-Have

### 5. Code Consistency

**Pattern:** Mix of function declarations and arrow functions

**Recommendation:** Standardize on arrow functions with forwardRef pattern:

```tsx
export const Component = forwardRef<HTMLDivElement, Props>((props, ref) => {
  // ...
});
Component.displayName = 'Component';
```

---

## Notes

- All high priority items should be completed before considering the UI package "production-ready"
- Medium priority items improve maintainability and align with ABE Stack principles
- Low priority items are optimizations that can be deferred

## Related Documentation

- `.claude/CLAUDE.md` - Project coding principles and workflows
- `docs/dev/principles/index.md` - Core design principles (DRY, separation of concerns)
- `docs/dev/testing/index.md` - Testing standards and requirements
- `docs/dev/patterns/index.md` - Common patterns to follow
