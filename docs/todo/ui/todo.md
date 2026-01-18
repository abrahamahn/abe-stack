# UI Package Priorities

_Last Updated: January 17, 2026_

Remaining work for packages/ui. These items are lower priority than V5 migration, CHET-Stack features, and Security Phase 2.

---

## Current State

**Test Coverage:** 724+ tests passing
**Components:** 16 components, 24 elements, 14 layouts, 13 hooks
**Demo:** Interactive gallery at `/features/demo`

---

## High Priority

### 1. Accessibility: Keyboard Support for ResizablePanel (Frontend)

- [ ] Add arrow key navigation for resize handles
- [ ] Handle Home/End keys for min/max sizes
- [ ] Update ARIA attributes for screen readers
- [ ] Add keyboard shortcut documentation

---

## Medium Priority

### 3. Demo Registry Split (Frontend)

Current `apps/web/src/features/demo/registry.tsx` is 1500+ lines.

Proposed split:

```
apps/web/src/features/demo/registry/
├── index.ts           # Re-exports
├── elements.tsx       # Element demos
├── components.tsx     # Component demos
├── layouts.tsx        # Layout demos
└── hooks.tsx          # Hook demos
```

### 4. Performance: Lazy Load Registry (Frontend)

- [ ] Lazy load demo components by category
- [ ] Add loading states for demo cards
- [ ] Measure and optimize initial bundle size

---

## Low Priority

### 5. Code Consistency (Frontend)

- [ ] Standardize on arrow functions with forwardRef pattern
- [ ] Ensure consistent prop naming across components
- [ ] Add JSDoc comments to all public APIs

### 6. Documentation (Frontend)

- [ ] Add usage examples to all component docs
- [ ] Add prop tables with types and defaults
- [ ] Add do/don't examples for common mistakes

### 7. Theme Enhancements (Frontend)

- [ ] Add density variants (compact/normal/comfortable)
- [ ] Add high-contrast mode support
- [ ] Document theme customization patterns

---

## Completed (January 2026)

- [x] Install modern React testing stack (user-event, msw, vitest-axe)
- [x] Enhanced 21+ element component tests with comprehensive coverage
- [x] Found and fixed Image component bug through TDD
- [x] Reorganize file structure: components/elements/layouts properly classified
- [x] Set up path aliases (@components, @elements, @hooks, etc.)
- [x] Update docs to match new file locations
- [x] Add missing tests for sidebar layouts
- [x] Create ThemeProvider with useTheme hook
- [x] Extract reusable components (Kbd, FormField, LoadingContainer, etc.)
- [x] Create useKeyboardShortcuts, useThemeMode, usePanelConfig hooks

---

## Notes

- UI work should not block V5 migration or CHET-Stack features
- Prioritize accessibility fixes over new features
- Demo improvements can wait until after real-time features

---

## Related Documentation

- [Roadmap](../../ROADMAP.md) - Full project roadmap
- [Testing Strategy](../../dev/testing.md) - Testing patterns
- [Changelog](../../CHANGELOG.md) - Recent changes
