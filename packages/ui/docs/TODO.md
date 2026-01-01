# UI Package TODO - Improvement Suggestions

Generated: 2026-01-01
Last Review: Code review of UI packages and demo page implementation

## High Priority

### 1. Missing Tests for New Layouts ✅ IN PROGRESS

**Status:** Being addressed
**Files:**

- `packages/ui/src/layouts/TopbarLayout.tsx` - No test coverage
- `packages/ui/src/layouts/BottombarLayout.tsx` - No test coverage

**Action Items:**

- [ ] Create `packages/ui/src/layouts/__tests__/TopbarLayout.test.tsx`
- [ ] Create `packages/ui/src/layouts/__tests__/BottombarLayout.test.tsx`

**Test Coverage Should Include:**

- Basic rendering
- Header/footer content renders correctly
- Custom height props work (default 64px)
- className and style props forwarding
- ref forwarding

**Reference:** Follow pattern in `AppShell.test.tsx`

---

### 2. Missing Documentation

**Files Needed:**

- `packages/ui/docs/layouts/TopbarLayout.md`
- `packages/ui/docs/layouts/BottombarLayout.md`

**Content Should Include:**

- Overview section
- Import statement
- Props table with types and defaults
- Usage examples (basic, custom height, with complex content)
- Do's and Don'ts
- Accessibility notes
- Related components
- References (source, tests)

**Reference:** Follow structure of `packages/ui/docs/primitives/ResizablePanel.md`

---

### 3. Add New Layouts to Demo Registry

**File:** `apps/web/src/demo/registry.tsx`

**Action Items:**

- [ ] Add `topbarLayout` entry to componentRegistry
- [ ] Add `bottombarLayout` entry to componentRegistry
- [ ] Include 2-3 variants for each:
  - Basic usage
  - With custom height
  - With complex header/footer content

**Example Structure:**

```tsx
topbarLayout: {
  id: 'topbarLayout',
  name: 'TopbarLayout',
  category: 'layouts',
  description: 'Layout with a fixed top navigation bar and scrollable content',
  variants: [
    { name: 'Basic', description: '...', code: '...', render: () => ... },
    // ... more variants
  ],
}
```

---

## Medium Priority

### 4. Split Large Registry File

**Current Issue:** `apps/web/src/demo/registry.tsx` is 1500+ lines

- Violates single responsibility principle
- Hard to maintain and navigate
- All demos load at once

**Proposed Structure:**

```
apps/web/src/demo/registry/
  ├── index.ts          # Re-exports and aggregates
  ├── primitives.tsx    # Accordion, Alert, Avatar, etc.
  ├── components.tsx    # Box, Button, Card, Input, etc.
  └── layouts.tsx       # All layout components
```

**Benefits:**

- Better organization
- Easier to find components
- Potential for code-splitting
- Follows DRY principle

---

### 5. Extract Inline Styles to Theme Variables

**File:** `apps/web/src/demo/DemoShell.tsx`

**Current Issues:**

- Magic numbers (padding: '16px', height: '40px', etc.)
- Duplicate style objects (closeButtonStyle)
- Inline styles make theming harder

**Suggested Refactor:**

```tsx
// Instead of inline styles:
style={{ padding: '16px', border: '1px solid #ddd' }}

// Use CSS classes with theme variables:
className="demo-panel"

// In CSS file:
.demo-panel {
  padding: var(--ui-gap-lg);
  border: var(--ui-border-width) solid var(--ui-color-border);
}
```

**Files to Create:**

- `apps/web/src/demo/DemoShell.css` (or use existing styles)

---

### 6. Extract Business Logic from Demo

**File:** `apps/web/src/demo/docs.ts`

**Current Issue:**

- `parseMarkdown` and `getComponentDocs` mix business logic with presentation
- These utilities might be useful elsewhere

**Recommendations:**

1. If reusable across apps: Move to `packages/shared/src/utils/`
2. If demo-specific: Keep but ensure framework-agnostic
3. Consider using a proper markdown library instead of regex

**Example Move:**

```
packages/shared/src/utils/markdown.ts
packages/shared/src/utils/docs.ts
```

---

### 7. Accessibility: Keyboard Support for ResizablePanel

**File:** `packages/ui/src/primitives/ResizablePanel.tsx`
**Docs Note:** Line 144 in `ResizablePanel.md` mentions this is missing

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

## Low Priority / Nice-to-Have

### 8. Memoize Expensive Operations

**File:** `apps/web/src/demo/DemoShell.tsx` (line ~358)

**Issue:** Markdown parsing happens on every render

**Fix:**

```tsx
const parsedDocs = useMemo(() => {
  if (!selectedComponent) return null;
  const docs = getComponentDocs(
    selectedComponent.id,
    selectedComponent.category,
    selectedComponent.name,
  );
  return docs ? parseMarkdown(docs) : null;
}, [selectedComponent?.id]);

// Then use:
{
  parsedDocs && <div dangerouslySetInnerHTML={{ __html: parsedDocs }} />;
}
```

---

### 9. Code Consistency

**Pattern:** Mix of function declarations and arrow functions

**Current State:**

```tsx
// Mix of:
export function SomeComponent() {}
export const OtherComponent = () => {};
```

**Recommendation:** Standardize on arrow functions with forwardRef pattern:

```tsx
export const Component = forwardRef<HTMLDivElement, Props>((props, ref) => {
  // ...
});
Component.displayName = 'Component';
```

**Files Affected:**

- Various layout and component files

---

### 10. Performance: Lazy Load Registry

**File:** `apps/web/src/demo/registry.tsx`

**Issue:** All 1500+ lines of component demos load immediately

**Proposed Solution:**

```tsx
// registry/index.ts
const registries = {
  primitives: () => import('./primitives'),
  components: () => import('./components'),
  layouts: () => import('./layouts'),
};

export const getComponentsByCategory = async (category: string) => {
  const registry = await registries[category]();
  return Object.values(registry.default);
};
```

**Benefits:**

- Faster initial load
- Only load what's needed
- Better code organization

---

## Completed

None yet.

---

## Notes

- All high priority items should be completed before considering the UI package "done"
- Medium priority items improve maintainability and align with ABE Stack principles
- Low priority items are optimizations that can be deferred

## Related Documentation

- `.claude/CLAUDE.md` - Project coding principles and workflows
- `docs/dev/principles/index.md` - Core design principles (DRY, separation of concerns)
- `docs/dev/testing/index.md` - Testing standards and requirements
- `docs/dev/patterns/index.md` - Common patterns to follow
