# ABE Stack Changelog

**Last Updated: January 10, 2026**

All notable changes to this project are documented here. Format follows semantic versioning principles.

---

## 2026-01-04

### Session 23 - File Reorganization

- **Component Classification Cleanup:**
  - Moved `Image.tsx` and `Card.tsx` from `elements/` to `components/` (have state/compound patterns)
  - Moved `Toaster.tsx` from `components/` to `elements/` (simple wrapper)
  - Moved `ResizablePanel.tsx` from `components/` to `layouts/shells/`
  - Moved `ProtectedRoute.tsx` from `components/` to `layouts/layers/`
  - Moved `AuthLayout.tsx` from `layouts/shells/` to `layouts/containers/`

- **Path Aliases:** Added @components, @elements, @hooks, @layouts, @styles, @test, @theme, @utils to packages/ui

- **Final Structure:**
  - Components (16): Accordion, Card, Dialog, Dropdown, FocusTrap, FormField, Image, LoadingContainer, Pagination, Popover, Radio, RadioGroup, Select, Slider, Tabs, Toast
  - Elements (24): Alert, Avatar, Badge, Box, Button, Checkbox, CloseButton, Divider, EnvironmentBadge, Heading, Input, Kbd, MenuItem, Progress, Skeleton, Spinner, Switch, Table, Text, TextArea, Toaster, Tooltip, VersionBadge, VisuallyHidden
  - Layouts/Shells (6): AppShell, BottombarLayout, LeftSidebarLayout, ResizablePanel, RightSidebarLayout, TopbarLayout
  - Layouts/Containers (4): AuthLayout, Container, PageContainer, StackedLayout
  - Layouts/Layers (4): Modal, Overlay, ProtectedRoute, ScrollArea
  - Hooks (13): useClickOutside, useControllableState, useCopyToClipboard, useDebounce, useDisclosure, useHistoryNav, useKeyboardShortcuts, useLocalStorage, useMediaQuery, useOnScreen, usePanelConfig, useThemeMode, useWindowSize

### Session 22 - ResizablePanel & DemoPage Fixes

- Added `reverse` prop to `ResizablePanelGroup` for column-reverse/row-reverse flex direction
- Fixed bottom bar and right bar positioning in DemoPage
- Fixed topbar header centering with equal-width containers

---

## 2026-01-03

### Session 21 - Major Feature Implementation

**Part 1: Provider Architecture**

- Created `AppProviders` component consolidating QueryClientProvider, AuthProvider, ApiProvider, HistoryProvider
- QueryClient created outside component to prevent recreation on re-renders

**Part 2: ThemeProvider**

- Created `ThemeProvider` and `useTheme` hook with mode, cycleMode, isDark, isLight, resolvedTheme
- localStorage persistence and data-theme attribute management
- 21 tests covering all functionality

**Part 3: Complete Auth System with Refresh Tokens**

- Database: Added `role` field to users, created `refreshTokens` table
- Server: Access tokens expire in 15 minutes, 7-day refresh tokens
- Routes: Register/Login create refresh tokens, Refresh rotates tokens, Logout invalidates
- Frontend: Auto-refresh interval (13 minutes), role-based access

**Part 4: DB Seeds**

- Seed script creates test users: admin@example.com, user@example.com, demo@example.com
- All use password: `password123`

---

## 2026-01-02

### Session 20 - Component Extraction

- **Extracted to packages/ui:**
  - `Kbd` - keyboard key display with size variants
  - `FormField` - label, error, helper text, required indicator
  - `LoadingContainer` - Spinner + Text for loading states
  - `EnvironmentBadge` - environment status display
  - `VersionBadge` - version display with optional prefix

- **New Hooks:**
  - `useKeyboardShortcuts` - global shortcuts with modifier support
  - `useThemeMode` - theme mode management with localStorage
  - `usePanelConfig` - panel configuration for resizable layouts

- **CSS Utilities:** Created `utilities.css` with `ui-` prefixed classes

### Session 19 - toastStore & HistoryProvider Extraction

- Moved `toastStore` to `packages/shared/src/stores/toastStore.ts`
- Moved `HistoryProvider/useHistoryNav` to `packages/ui/src/hooks/useHistoryNav.tsx`
- Moved `ProtectedRoute` to `packages/ui/src/components/ProtectedRoute.tsx`
- Moved `Toaster` to `packages/ui/src/components/Toaster.tsx`

### Session 18 - DemoShell Enhancements

- Added version info (v1.1.0), environment badge, component count to bottom bar
- Added keyboard shortcuts: L (left panel), R (right panel), T (theme), Esc (deselect)
- Fixed panel size persistence with controlled mode

---

## 2026-01-01

### Sessions 1-17 - Testing Framework & TDD

**Testing Infrastructure (Session 1):**

- Installed @testing-library/user-event, msw@2.12.7, vitest-axe
- Created MSW configuration with handlers and server setup
- Created comprehensive testing documentation

**TDD Test Enhancements:**

- Switch: 1 → 24 tests
- Accordion: 2 → 33 tests
- Checkbox: 2 → 39 tests
- Dialog: 5 → 45 tests
- Dropdown: 4 → 39 tests
- Image: 6 → 47 tests (**Found real bug: state not reset on src change**)
- Modal: 4 → 51 tests
- Overlay: 1 → 35 tests
- Pagination: 2 → 39 tests
- Popover: 2 → 45 tests
- Radio: 2 → 39 tests
- RadioGroup: 3 → 35 tests
- Select: 2 → 20 tests

**Component Refactoring:**

- Implemented `RadioGroupContext` for proper context propagation
- Fixed Select keyboard navigation to skip disabled options
- Added `aria-activedescendant` to Select for accessibility

**Final Test Count:** 724 tests in packages/ui

---

## 2025-12-31

### UI Package Enhancements

- **Elements (~25):** Accordion, Alert, Avatar, Badge, Card, Checkbox, Divider, Dropdown/MenuItem, Heading, Input/TextArea, Modal/Overlay/Dialog, Pagination, Popover, Progress, Radio, Select, Skeleton, Slider, Switch, Tabs, Text, Toast, Tooltip, VisuallyHidden

- **Infrastructure:**
  - Hooks: useDisclosure, useControllableState, useClickOutside, useMediaQuery
  - Theme: colors, spacing, typography tokens with light/dark mode
  - Layouts: Container, AuthLayout, SidebarLayout, StackedLayout
  - Utils: cn (classname merging)

- **Demo:** Component gallery at `/features/demo`

---

## 2025-12-30

### UI Refinements (Sessions 20-52)

- ResizablePanel: collapsed styling, separator drag callbacks, invertResize support
- ScrollArea: custom scrollbar with fade-in/out, WebKit box-shadow technique
- Theme: Added `--ui-layout-border`, success/danger text tones
- Select: matched option typography to trigger, chevron toggle icon
- Dialog: styled trigger button for dark mode
- AuthLayout: card background to theme surface color

---

## 2025-12-29

### Major Documentation Overhaul

- Created CLAUDE.md (2600+ lines) - comprehensive development guide
- Created AGENTS.md - AI agent quick reference
- Split into modular `dev/` structure for context window optimization
- Established documentation workflow: log.md, TODO.md, milestone.md
- Quality gates: format, lint, type-check, test must pass

### Foundation Work

- Aligned API prefixing under `/api`
- Introduced `@abeahn/storage` with local and S3 providers
- Added UI elements: Flex, Stack, Text, Heading, Surface, and more
- Auth route tests and Playwright auth scaffold

---

## Pre-2025-12-29

### Core Stack Established

- **Monorepo:** Turborepo + pnpm workspaces, TS project refs
- **Backend:** Fastify + ts-rest + Drizzle, JWT auth, health checks
- **Frontend:** Vite + React, AuthContext, ProtectedRoute
- **API Client:** Type-safe client with bearer token injection
- **Testing:** Vitest config, Playwright scaffold
- **Infrastructure:** Docker, db restart scripts, export:ui script
