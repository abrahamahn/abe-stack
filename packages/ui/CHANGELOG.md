# Changelog

All notable changes to `@abe-stack/ui` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Path aliases in tsconfig: @components, @elements, @hooks, @layouts, @styles, @test, @theme, @utils

### Changed

- Reorganized file structure for better component classification:
  - Moved `Image.tsx` and `Card.tsx` from elements/ to components/ (stateful/compound patterns)
  - Moved `Toaster.tsx` from components/ to elements/ (simple wrapper)
  - Moved `ResizablePanel.tsx` from components/ to layouts/shells/
  - Moved `ProtectedRoute.tsx` from components/ to layouts/layers/
  - Moved `AuthLayout.tsx` from layouts/shells/ to layouts/containers/
- Updated documentation to match new file locations

## [1.1.0] - 2026-01-03

### Added

- `ThemeProvider` component with `useTheme` hook for theme context
- `useKeyboardShortcuts` hook for global keyboard shortcuts with modifier support
- `useThemeMode` hook for theme mode management (system/light/dark)
- `usePanelConfig` hook for panel configuration with localStorage persistence
- `Kbd` component for keyboard key display with size variants
- `FormField` component with label, error message, helper text support
- `LoadingContainer` component combining Spinner and Text
- `EnvironmentBadge` component for environment status display
- `VersionBadge` component for version display
- `ProtectedRoute` component for auth-protected routes
- `Toaster` component for toast notifications
- `HistoryProvider` and `useHistoryNav` hook for history navigation
- CSS utilities in `utilities.css` for flex, gap, padding, margin, typography

### Changed

- `ResizablePanel` now supports controlled mode with `size` prop
- `ResizablePanelGroup` now supports `reverse` prop for flex direction
- Consolidated component styles into `components.css`
- Moved layout styles into `layouts.css`
- Moved stylesheets into `packages/ui/src/styles` directory

### Fixed

- `Image` component now resets loading/error state when `src` prop changes
- `ResizablePanel` collapsed panel styling and animation
- `ScrollArea` scrollbar visibility and fade behavior
- Dark mode contrast improvements for toast, tooltip, and text elements

## [1.0.0] - 2026-01-01

### Added

- Modern React testing stack (user-event, msw, vitest-axe)
- Comprehensive test coverage for 21+ element components
- MSW configuration for network mocking
- Accessibility testing with vitest-axe

### Changed

- Enhanced component tests with userEvent instead of fireEvent
- Added edge case coverage for all interactive components
- Improved keyboard navigation tests

### Fixed

- `Image` component state reset on src change (found through TDD)
- `Select` keyboard navigation now skips disabled options
- `RadioGroup` context propagation for name/value sharing
- `Radio` accessibility (removed duplicate role="radio")

## [0.9.0] - 2024-12-31

### Added

- Hooks infrastructure: useDisclosure, useControllableState, useClickOutside, useMediaQuery
- Theme tokens: colors, spacing, typography
- Layout components: Container, AuthLayout, SidebarLayout, StackedLayout
- Utils: cn (classname utility)
- ComponentGallery page for component visualization
- Toaster with zustand-based toast store
- FocusTrap component for modal accessibility
- Polymorphic Text/Heading typing

### Changed

- Refactored Accordion/Dropdown/Popover/Dialog to use controlled-state hooks
- Dropdown supports function children for close handling
- Portaled dialog overlay/content to body
- Applied UI theme variables globally

## [0.8.0] - 2024-12-30

### Added

- Overlay, Modal, Drawer components
- Progress, Skeleton components
- Alert, InputElement, TextArea, Select elements
- Dropdown/MenuItem, Pagination, Table elements
- Popover, Switch, Checkbox, Radio, FormField elements

### Changed

- Refined elements CSS with polished tokens
- Light/dark theme via prefers-color-scheme
- Variable-driven tones for badges/alerts/progress/switch
- Increased dark-mode text contrast

## [0.7.0] - 2024-12-29

### Added

- Dialog compound API (Root, Trigger, Overlay, Content, Title, Description)
- RTL tests for Tabs, Dropdown, Select
- Keyboard/focus tests for Dropdown, Tabs, Popover, Checkbox/Radio
- Dialog focus trap and focus restoration

### Changed

- Tabs now support arrow key navigation
- Dropdown closes on Escape key
- Dropdown/Popover triggers are keyboard-activatable

## [0.6.0] - 2024-12-29

### Added

- Initial UI element tests for Accordion and Modal
- Accordion toggle/aria-expanded tests
- Modal open/close via overlay tests

## [0.5.0] - 2024-12-29

### Added

- Pruned elements to lean Radix-style set (~25 components)
- Accordion, Alert, Avatar, Badge, CardElement
- Checkbox, Divider, Dropdown/MenuItem, Heading
- InputElement/TextArea, Modal/Overlay, Pagination
- Popover, Progress, Radio, Select, Skeleton
- Slider, Switch, Tabs, Text, Toast, Tooltip
- VisuallyHidden

## [0.4.0] - 2024-12-29

### Added

- Tooltip, CardElement, Pill, Link elements
- Tabs, Accordion, Toast, LinkButton elements
- Icon, Avatar, IconButton, Chip, BadgeElement
- Kbd, Code, Tag, List elements
- Divider, Spacer, Grid, Container, VisuallyHidden
- Flex, Stack, Text, Heading, Surface elements

### Changed

- Namespaced UI exports to avoid name clashes

## Initial Release - 2024-12-28

### Added

- Initial package setup
- Basic component structure
- Theme system foundation
